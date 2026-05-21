import twilio from "twilio"

/**
 * Send an SMS via Twilio. Returns { data: true } on success, { data: false, error } on failure.
 * Silently skips (returns data: false, no throw) when env vars are not configured.
 */
export async function sendSms(
  to: string,
  body: string,
): Promise<{ data: boolean; error: string | null }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !from) {
    return { data: false, error: "Twilio env vars not configured" }
  }

  if (!to || !body) {
    return { data: false, error: "Missing required parameter: to and body are required" }
  }

  try {
    const client = twilio(accountSid, authToken)
    await client.messages.create({ from, to, body })
    return { data: true, error: null }
  } catch (err: any) {
    console.error("Twilio sendSms error:", String(err?.message ?? err))
    return { data: false, error: String(err?.message ?? "Unknown Twilio error") }
  }
}
