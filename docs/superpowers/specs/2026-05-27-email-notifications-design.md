# Email Notifications Design

**Date:** 2026-05-27  
**Status:** Approved

## Problem

Twilio SMS phone number is not yet approved. The site is live and needs notifications working immediately. Email must be added everywhere SMS is currently used, and the settings UI must allow independent control of both channels.

## Trigger Points (4 places)

| Event | File | Current toggle |
|---|---|---|
| New public quote from shop | `src/app/api/orders/route.ts` | `onNewOrder` |
| Order state change | `src/app/api/orders/[id]/route.ts` | `onStateChange` |
| Payment recorded | `src/app/api/payments/route.ts` | `onPayment` |
| Contact form submission | `src/app/api/contact/route.ts` | none (fires if channel enabled) |

## Architecture

### 1. Schema (`prisma/schema.prisma`)

Two new fields added to `NotificationSettings`. Migration required (user runs it manually).

```prisma
emailEnabled    Boolean  @default(false)
emailRecipients String?  // comma-separated: "you@co.com,partner@co.com"
```

`onNewOrder`, `onStateChange`, `onPayment` toggles remain **shared** between both channels — one toggle controls "notify on X via all active channels."

### 2. Email Service (`src/services/emailService.ts`)

New service mirroring `twilioService.ts`. Uses existing `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`. Hits Twilio Comms API: `POST https://comms.twilio.com/v1/Emails`.

New env var needed: `TWILIO_FROM_EMAIL`. When missing, silently returns `{ data: false, error: "Email env vars not configured" }` — no throw, no crash.

Multiple recipients: each email gets its own object in the Twilio `to` array.

Content: plain text (same verbatim messages as SMS — no HTML templates needed for an internal admin tool).

```ts
export async function sendEmail(
  recipients: string[],
  subject: string,
  body: string,
): Promise<{ data: boolean; error: string | null }>
```

### 3. Notification Settings API (`src/app/api/admin/notification-settings/route.ts`)

- `DEFAULT_SETTINGS` gains `emailEnabled: false` and `emailRecipients: null`
- GET returns both new fields
- PATCH accepts `emailEnabled` (boolean) and `emailRecipients` (string | null)

### 4. Route Handler Changes (all 4 files)

Each gains a parallel email block alongside the existing SMS block:

```ts
// Email — fire-and-forget
const recipients = parseEmailRecipients(ns?.emailRecipients)
if (ns?.emailEnabled && recipients.length > 0) {
  sendEmail(recipients, subject, body).catch(() => {})
}
```

`parseEmailRecipients` is a small helper in `emailService.ts` that splits by comma and/or newline, trims, and filters empties.

Contact form: fires email if `emailEnabled && recipients.length > 0` (no event toggle, same as SMS today).

### 5. Settings UI (`Dashboard-SettingsView.tsx`)

The Notifications section gains a second card for Email, structured identically to the SMS card:

- **Email Notifications** toggle (on/off)
- Textarea for recipients: "Enter one email per line, or separate with commas"
- Saves on blur (same as phone field today)
- The three event toggles below enable when `smsEnabled || emailEnabled` (previously only `smsEnabled`)

`NotifSettings` type gains `emailEnabled: boolean` and `emailRecipients: string | null`.

### 6. Env Vars

`TWILIO_FROM_EMAIL` added to `.env.example`.

## Migration Command

```bash
npx prisma migrate dev --name add-email-notifications
```

User must run this manually.

## Files Changed

| Action | File |
|---|---|
| Create | `src/services/emailService.ts` |
| Modify | `prisma/schema.prisma` |
| Modify | `src/app/api/admin/notification-settings/route.ts` |
| Modify | `src/app/api/orders/route.ts` |
| Modify | `src/app/api/orders/[id]/route.ts` |
| Modify | `src/app/api/payments/route.ts` |
| Modify | `src/app/api/contact/route.ts` |
| Modify | `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx` |
| Modify | `.env.example` |
