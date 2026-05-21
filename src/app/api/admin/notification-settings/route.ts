import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_SETTINGS = {
  smsEnabled: false,
  smsPhone: null,
  onNewOrder: true,
  onStateChange: true,
  onPayment: true,
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { id: 1 },
      create: DEFAULT_SETTINGS,
      update: {},
    })
    return NextResponse.json({ data: settings, error: null })
  } catch (err) {
    console.error("[notification-settings GET]", err)
    return NextResponse.json({ data: null, error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 })
  }

  const { smsEnabled, smsPhone, onNewOrder, onStateChange, onPayment } = body

  const data: Record<string, any> = { updatedBy: session.user.email ?? null }
  if (smsEnabled !== undefined) data.smsEnabled = Boolean(smsEnabled)
  if (smsPhone !== undefined) data.smsPhone = smsPhone || null
  if (onNewOrder !== undefined) data.onNewOrder = Boolean(onNewOrder)
  if (onStateChange !== undefined) data.onStateChange = Boolean(onStateChange)
  if (onPayment !== undefined) data.onPayment = Boolean(onPayment)

  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { id: 1 },
      create: { ...DEFAULT_SETTINGS, ...data },
      update: data,
    })
    return NextResponse.json({ data: settings, error: null })
  } catch (err) {
    console.error("[notification-settings PATCH]", err)
    return NextResponse.json({ data: null, error: "Failed to save settings" }, { status: 500 })
  }
}
