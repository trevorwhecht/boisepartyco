// src/services/emailService.ts

/**
 * Parse a comma- and/or newline-separated list of email addresses.
 * Trims whitespace and filters empty strings.
 */
export function parseEmailRecipients(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Send a transactional email via Twilio Comms API.
 * Returns { data: true } on success, { data: false, error } on failure.
 * Silently skips (returns data: false, no throw) when env vars are not configured.
 */
export async function sendEmail(
  recipients: string[],
  subject: string,
  body: string,
): Promise<{ data: boolean; error: string | null }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_EMAIL

  if (!accountSid || !authToken || !from) {
    return { data: false, error: "Email env vars not configured" }
  }

  if (recipients.length === 0) {
    return { data: false, error: "No recipients" }
  }

  try {
    const res = await fetch("https://comms.twilio.com/v1/Emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: JSON.stringify({
        from: { address: from },
        to: recipients.map((address) => ({ address })),
        content: {
          subject,
          text: body,
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Twilio sendEmail error:", res.status, text)
      return { data: false, error: `Twilio email error: ${res.status}` }
    }

    return { data: true, error: null }
  } catch (err: any) {
    console.error("Twilio sendEmail error:", err?.message ?? err)
    return { data: false, error: err?.message ?? "Unknown email error" }
  }
}
