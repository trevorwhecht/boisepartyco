import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendSms } from "@/services/twilioService"
import { sendEmail, parseEmailRecipients } from "@/services/emailService"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { orderId, amount, channel, note, paidAt } = body

  if (!orderId || !amount || !channel) {
    return NextResponse.json({ data: null, error: "orderId, amount, and channel are required" }, { status: 400 })
  }

  const me = await prisma.user.findUnique({ where: { email: session.user.email! }, select: { id: true } })

  const payment = await prisma.payment.create({
    data: {
      orderId: Number(orderId),
      userId: me?.id ?? null,
      amount: Number(amount),
      channel,
      note: note || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      createdBy: session.user.email ?? null,
    },
  })

  // Notify all admins of the new payment
  const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
  const amountFormatted = `$${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        orderId: Number(orderId),
        type: "payment_recorded",
        title: `Payment Recorded — Order #${orderId}`,
        message: `${amountFormatted} payment (${channel}) was recorded on Order #${orderId}.`,
        actionUrl: `/dashboard`,
      })),
    }).catch(() => {})
  }

  // SMS — fire-and-forget
  const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
  if (ns?.smsEnabled && ns.onPayment && ns.smsPhone) {
    sendSms(
      ns.smsPhone,
      `Payment of ${amountFormatted} (${channel}) recorded on Order #${orderId}.`,
    ).catch(() => {})
  }
  // Email — fire-and-forget
  const emailRecipients = parseEmailRecipients(ns?.emailRecipients)
  if (ns?.emailEnabled && ns.onPayment && emailRecipients.length > 0) {
    sendEmail(
      emailRecipients,
      `Payment Recorded — Order #${orderId}`,
      `Payment of ${amountFormatted} (${channel}) recorded on Order #${orderId}.`,
    ).catch(() => {})
  }

  return NextResponse.json({ data: { ...payment, amount: Number(payment.amount) }, error: null }, { status: 201 })
}
