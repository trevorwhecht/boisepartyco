// POST /api/orders/[id]/check-dates
// Admin-only. Given a proposed date range, checks whether the order's current
// line items would conflict with other orders. Excludes the order's own bookings
// so re-checking existing dates always returns clean. Warns but never blocks.
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { validateOrderLines } from "@/services/inventoryService"
import { parseLocalDate } from "@/lib/availability"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const orderId = Number(id)
  const body = await req.json()
  const { from: fromStr, to: toStr } = body

  if (!fromStr || !toStr) {
    return NextResponse.json({ data: null, error: "from and to are required" }, { status: 400 })
  }

  const from = parseLocalDate(fromStr)
  const to = parseLocalDate(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ data: null, error: "Invalid date range" }, { status: 400 })
  }

  const lineItems = await prisma.orderLineItem.findMany({
    where: { orderId },
    select: { itemId: true, tentConfigId: true, qty: true },
  })

  const validationLines = lineItems
    .filter((li) => li.itemId !== null || li.tentConfigId !== null)
    .map((li) => ({
      kind: (li.itemId !== null ? "item" : "tentConfig") as "item" | "tentConfig",
      refId: (li.itemId ?? li.tentConfigId)!,
      qty: li.qty,
    }))

  if (validationLines.length === 0) {
    return NextResponse.json({ data: { ok: true, conflicts: [], warnings: [] }, error: null })
  }

  const result = await validateOrderLines(validationLines, from, to, orderId)
  return NextResponse.json({ data: result, error: null })
}
