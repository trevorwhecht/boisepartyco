// src/app/api/admin/notification-settings/route.ts
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
  } catch {
    return NextResponse.json({ data: null, error: "Failed to load notification settings" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 })
  }
  const { smsEnabled, smsPhone, onNewOrder, onStateChange, onPayment } = body

  const patch: Record<string, any> = { updatedBy: session.user.email ?? null }
  if (smsEnabled !== undefined) patch.smsEnabled = Boolean(smsEnabled)
  if (smsPhone !== undefined) patch.smsPhone = smsPhone || null
  if (onNewOrder !== undefined) patch.onNewOrder = Boolean(onNewOrder)
  if (onStateChange !== undefined) patch.onStateChange = Boolean(onStateChange)
  if (onPayment !== undefined) patch.onPayment = Boolean(onPayment)

  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { id: 1 },
      create: { ...DEFAULT_SETTINGS, ...patch },
      update: patch,
    })
    return NextResponse.json({ data: settings, error: null })
  } catch {
    return NextResponse.json({ data: null, error: "Failed to update notification settings" }, { status: 500 })
  }
}
