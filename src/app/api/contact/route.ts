import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSms } from "@/services/twilioService"
import { sendEmail, parseEmailRecipients } from "@/services/emailService"
import { fmtRangeShort } from "@/lib/availability"

function parseLocalDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 })
  }

  const { name, email, phone, dateConfirmed, eventDateStart, eventDateEnd, eventAddress, message } = body

  const missing =
    !name ||
    !email ||
    !phone ||
    !eventAddress ||
    (dateConfirmed && (!eventDateStart || !eventDateEnd)) ||
    (!dateConfirmed && !message)

  if (missing) {
    return NextResponse.json({ data: null, error: "Missing required fields" }, { status: 400 })
  }

  if (!String(email).includes("@")) {
    return NextResponse.json({ data: null, error: "Invalid email address" }, { status: 400 })
  }

  try {
    const settings = await prisma.notificationSettings.findUnique({ where: { id: 1 } })

    if (settings?.smsEnabled && settings.smsPhone) {
      const eventDateLine = dateConfirmed
        ? (() => {
            const start = parseLocalDateStr(String(eventDateStart))
            const end = parseLocalDateStr(String(eventDateEnd))
            return `Event Date: ${fmtRangeShort(start, end)} ✓ Confirmed`
          })()
        : `Event Date: Not confirmed`

      const lines = [
        "📋 New Contact Form",
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        eventDateLine,
        `Event Address: ${eventAddress}`,
      ]

      if (message) {
        lines.push(`Message: ${message}`)
      }

      const smsResult = await sendSms(settings.smsPhone, lines.join("\n"))
      if (!smsResult.data) console.warn("[contact POST] SMS not sent:", smsResult.error)
    }

    // Email — fire-and-forget
    const emailRecipients = parseEmailRecipients(settings?.emailRecipients)
    if (settings?.emailEnabled && emailRecipients.length > 0) {
      const eventDateLine = dateConfirmed
        ? (() => {
            const start = parseLocalDateStr(String(eventDateStart))
            const end = parseLocalDateStr(String(eventDateEnd))
            return `Event Date: ${fmtRangeShort(start, end)} — Confirmed`
          })()
        : `Event Date: Not confirmed`
      const emailLines = [
        "New Contact Form Submission",
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        eventDateLine,
        `Event Address: ${eventAddress}`,
      ]
      if (message) emailLines.push(`Message: ${message}`)
      sendEmail(emailRecipients, "New Contact Form Submission", emailLines.join("\n")).catch(() => {})
    }

    return NextResponse.json({ data: true, error: null })
  } catch (err) {
    console.error("[contact POST]", err)
    return NextResponse.json({ data: null, error: "Failed to process request" }, { status: 500 })
  }
}
