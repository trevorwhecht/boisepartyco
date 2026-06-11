import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeOrder, stripAdminFields, computeOrderTotals } from "@/services/orderService"
import { validateOrderLines } from "@/services/inventoryService"
import { getInventoryMode } from "@/lib/settings"
import { sendSms } from "@/services/twilioService"
import { sendEmail, parseEmailRecipients } from "@/services/emailService"
import { parseLocalDate } from "@/lib/availability"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

  const role = session.user.role
  if (role !== "admin" && role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const orders = await prisma.order.findMany({
    include: {
      state: { select: { id: true, name: true, color: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      _count: { select: { orderLineItems: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const serialized = orders.map((o) => serializeOrder(o))
  const data = role === "employee" ? serialized.map((o) => stripAdminFields(o)) : serialized

  return NextResponse.json({ data, error: null })
}

function generateToken(): string {
  return `ord-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`
}

async function handlePublicShopQuote(body: any): Promise<Response> {
  const { pickupDate, dropoffDate, customer, lines, customerNotes, userId: bodyUserId, consentSms, consentEmail } = body

  if (!pickupDate || !dropoffDate) {
    return NextResponse.json({ data: null, error: "pickupDate and dropoffDate are required" }, { status: 400 })
  }
  if (!bodyUserId && (!customer?.firstName || !customer?.lastName || !customer?.email || !customer?.phone)) {
    return NextResponse.json({ data: null, error: "customer firstName, lastName, email, and phone are required" }, { status: 400 })
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ data: null, error: "At least one line is required" }, { status: 400 })
  }

  const startDate = parseLocalDate(pickupDate)
  const endDate = parseLocalDate(dropoffDate)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
    return NextResponse.json({ data: null, error: "Invalid date range — dropoffDate must be after pickupDate" }, { status: 400 })
  }

  for (const line of lines) {
    if (!["item", "tentConfig"].includes(line.kind) || !Number.isInteger(Number(line.refId)) || Number(line.qty) < 1) {
      return NextResponse.json(
        { data: null, error: "Each line requires kind ('item'|'tentConfig'), integer refId, and qty >= 1" },
        { status: 400 },
      )
    }
  }

  // Validate availability before accepting the order — skip when mode is off or fully_in_stock
  const inventoryMode = await getInventoryMode()
  const validationLines = lines.map((l: any) => ({ kind: l.kind, refId: Number(l.refId), qty: Number(l.qty) }))
  const validation = inventoryMode === "on"
    ? await validateOrderLines(validationLines, startDate, endDate)
    : { ok: true, conflicts: [], warnings: [] }
  if (!validation.ok) {
    return NextResponse.json({
      data: null,
      error: "Some items are no longer available for your dates",
      conflicts: validation.conflicts,
    }, { status: 409 })
  }

  // Look up prices from DB — never trust client-sent prices
  const itemRefIds = lines.filter((l: any) => l.kind === "item").map((l: any) => Number(l.refId))
  const configRefIds = lines.filter((l: any) => l.kind === "tentConfig").map((l: any) => Number(l.refId))

  const [dbItems, dbConfigs] = await Promise.all([
    itemRefIds.length
      ? prisma.item.findMany({ where: { id: { in: itemRefIds } }, select: { id: true, name: true, flatPrice: true } })
      : Promise.resolve([]),
    configRefIds.length
      ? prisma.tentConfiguration.findMany({ where: { id: { in: configRefIds } }, select: { id: true, name: true, flatPrice: true } })
      : Promise.resolve([]),
  ])

  const itemMap = new Map(dbItems.map((i) => [i.id, i]))
  const configMap = new Map(dbConfigs.map((c) => [c.id, c]))

  const missing = lines.find((l: any) =>
    l.kind === "item" ? !itemMap.has(Number(l.refId)) : !configMap.has(Number(l.refId))
  )
  if (missing) {
    return NextResponse.json({ data: null, error: `${missing.kind} ${missing.refId} not found` }, { status: 400 })
  }

  const lineItemRows = lines.map((line: any, idx: number) => {
    const ref = line.kind === "item" ? itemMap.get(Number(line.refId)) : configMap.get(Number(line.refId))
    const unitPrice = Number(ref!.flatPrice)
    const warn = validation.warnings.find((w) => w.kind === line.kind && w.refId === Number(line.refId))
    return {
      description: ref!.name,
      qty: Number(line.qty),
      unitPrice,
      lineTotal: Number(line.qty) * unitPrice,
      unitCost: 0,
      sortOrder: idx,
      notes: line.notes ?? null,
      availabilityWarning: warn ? `Low stock: ${warn.available} available for these dates` : null,
      ...(line.kind === "item" ? { itemId: Number(line.refId) } : { tentConfigId: Number(line.refId) }),
    }
  })

  // Resolve which user to link the order to
  let linkedUserId: string
  if (bodyUserId) {
    const existingUser = await prisma.user.findUnique({ where: { id: bodyUserId }, select: { id: true, role: true } })
    if (!existingUser) {
      return NextResponse.json({ data: null, error: "Selected user not found" }, { status: 400 })
    }
    if (existingUser.role === "admin" || existingUser.role === "employee") {
      return NextResponse.json({ data: null, error: "Orders cannot be linked to staff accounts" }, { status: 400 })
    }
    linkedUserId = existingUser.id
  } else {
    // Check before upsert — never link an order to a staff account
    const existingByEmail = await prisma.user.findUnique({
      where: { email: customer.email.toLowerCase() },
      select: { id: true, role: true },
    })
    if (existingByEmail && (existingByEmail.role === "admin" || existingByEmail.role === "employee")) {
      return NextResponse.json({
        data: null,
        error: "That email belongs to a staff account. Please sign in or use a different email.",
      }, { status: 400 })
    }

    const guestUser = await prisma.user.upsert({
      where: { email: customer.email.toLowerCase() },
      update: {},
      create: {
        email: customer.email.toLowerCase(),
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        role: "user",
        password: "__guest__",
      },
      select: { id: true },
    })
    linkedUserId = guestUser.id
  }

  const taxSetting = await prisma.universalSettings.findUnique({ where: { setting: "taxRate" } })
  const taxRate = taxSetting ? Number(taxSetting.value) : 0
  const totals = computeOrderTotals({ lineItems: lineItemRows, setUpCosts: [], taxRate })

  const [order] = await Promise.all([
    prisma.order.create({
      data: {
        state: { connect: { id: 1 } },
        user: { connect: { id: linkedUserId } },
        startDate,
        endDate,
        customerNotes: customerNotes ?? null,
        token: generateToken(),
        createdBy: customer.email || null,
        consentSms: consentSms === true,
        consentEmail: consentEmail === true,
        ...totals,
        orderLineItems: { create: lineItemRows },
      },
      select: { id: true, token: true },
    }),
    // Persist consent preferences to the user's profile (only set, never unset)
    consentSms === true || consentEmail === true
      ? prisma.user.update({
          where: { id: linkedUserId },
          data: {
            ...(consentSms === true ? { consentSms: true } : {}),
            ...(consentEmail === true ? { consentEmail: true } : {}),
          },
        })
      : Promise.resolve(null),
  ])

  // Notify all admins on public submission (DB notification + optional SMS)
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        orderId: order.id,
        type: "order_submitted",
        title: "New Quote Request",
        message: `A new quote request (#${order.id}) was submitted via the shop.`,
        actionUrl: `/dashboard`,
      })),
    }).catch(() => {})
  }

  // SMS — fire-and-forget, never block the response
  const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
  const customerName = `${customer.firstName} ${customer.lastName}`.trim()
  if (ns?.smsEnabled && ns.onNewOrder && ns.smsPhone) {
    sendSms(
      ns.smsPhone,
      `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
    ).catch(() => {})
  }
  // Email — fire-and-forget
  const emailRecipients = parseEmailRecipients(ns?.emailRecipients)
  if (ns?.emailEnabled && ns.onNewOrder && emailRecipients.length > 0) {
    sendEmail(
      emailRecipients,
      `New Quote Request #${order.id}`,
      `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
    ).catch(() => {})
  }

  return NextResponse.json({ data: { id: order.id, token: order.token }, error: null }, { status: 201 })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const body = await req.json()

  // Public shop quote — different payload shape
  if (body.pickupDate !== undefined) {
    try {
      return await handlePublicShopQuote(body)
    } catch (err: any) {
      console.error("[POST /api/orders] unhandled error:", err)
      return NextResponse.json({ data: null, error: "Something went wrong on our end. Please try again or call us at (208) 306-3079." }, { status: 500 })
    }
  }

  // Staff path — everything below is unchanged from the original file
  const role = session?.user?.role ?? "anonymous"
  const isStaff = role === "admin" || role === "employee"
  const isPublic = !session
  const { customerNotes, notes, startDate: bodyStartDate, isHardDeadline, needsShipping, taxDeferralRequested, lineItems = [] } = body
  const userId = isStaff ? (body.userId || null) : null
  const nickname = body.nickname || null
  const stateId = isStaff ? (body.stateId ?? 1) : 1

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json({ data: null, error: "At least one line item is required" }, { status: 400 })
  }

  const taxSetting = await prisma.universalSettings.findUnique({ where: { setting: "taxRate" } })
  const taxRate = taxSetting ? Number(taxSetting.value) : 0
  // Normalize lineItems to ensure unitCost is always a number (public submissions omit it)
  const normalizedLineItems = lineItems.map((li: any) => ({ ...li, unitCost: li.unitCost ?? 0 }))
  const totals = computeOrderTotals({ lineItems: normalizedLineItems, setUpCosts: [], taxRate })

  const order = await prisma.order.create({
    data: {
      state: { connect: { id: stateId } },
      ...(userId ? { user: { connect: { id: userId } } } : {}),
      nickname,
      customerNotes: customerNotes || null,
      notes: isStaff ? (notes || null) : null,
      startDate: bodyStartDate ? new Date(bodyStartDate) : null,
      isHardDeadline: isHardDeadline ?? false,
      needsShipping: needsShipping ?? false,
      taxDeferralRequested: taxDeferralRequested ?? false,
      token: generateToken(),
      ...totals,
      createdBy: session?.user?.email ?? "anonymous",
      orderLineItems: {
        create: normalizedLineItems.map((li: any, idx: number) => ({
          description: li.description,
          qty: li.qty,
          unitPrice: li.unitPrice ?? 0,
          lineTotal: li.qty * (li.unitPrice ?? 0),
          unitCost: isStaff ? (li.unitCost ?? 0) : 0,
          sortOrder: idx,
          notes: li.notes || null,
        })),
      },
    },
    include: {
      state: { select: { id: true, name: true, color: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { orderLineItems: true } },
    },
  })

  const serialized = serializeOrder(order)
  const data = role === "employee" ? stripAdminFields(serialized) : serialized
  return NextResponse.json({ data, error: null }, { status: 201 })
}
