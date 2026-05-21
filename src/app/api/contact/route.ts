import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendSms } from "@/services/twilioService"

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ data: null, error: "Invalid request body" }, { status: 400 })
  }

  const { name, email, phone, dateConfirmed, eventDate, eventAddress, message } = body

  const missing =
    !name ||
    !email ||
    !phone ||
    !eventAddress ||
    (dateConfirmed && !eventDate) ||
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
            // Parse date-only strings (YYYY-MM-DD) as local dates to avoid UTC offset shifting the day
            const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(eventDate))
              ? new Date(String(eventDate) + "T00:00:00")
              : new Date(String(eventDate))
            return `Event Date: ${parsedDate.toDateString().replace(/^\S+\s/, "")} ✓ Confirmed`
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

    return NextResponse.json({ data: true, error: null })
  } catch (err) {
    console.error("[contact POST]", err)
    return NextResponse.json({ data: null, error: "Failed to process request" }, { status: 500 })
  }
}
