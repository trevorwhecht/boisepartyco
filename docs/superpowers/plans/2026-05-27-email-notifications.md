# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Twilio email notifications alongside existing SMS, with independent channel control in the admin settings UI.

**Architecture:** New `emailService.ts` mirrors `twilioService.ts` — uses same Twilio credentials plus `TWILIO_FROM_EMAIL`, hitting the Twilio Comms API. Each of the 4 trigger route handlers gains a parallel email block. The Settings UI gains a second card for email, and event toggles enable when either channel is on.

**Tech Stack:** Next.js App Router · Prisma · TypeScript · Vitest · Twilio Comms API · Tailwind 4 · shadcn/ui

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/services/emailService.ts` | `sendEmail()` + `parseEmailRecipients()` |
| Create | `src/services/emailService.test.ts` | Unit tests for `parseEmailRecipients` |
| Modify | `prisma/schema.prisma` | Add `emailEnabled` + `emailRecipients` to `NotificationSettings` |
| Modify | `src/app/api/admin/notification-settings/route.ts` | Expose new fields in GET/PATCH |
| Modify | `src/app/api/orders/route.ts` | Email block after SMS block in `handlePublicShopQuote` |
| Modify | `src/app/api/orders/[id]/route.ts` | Email block after SMS block in PATCH state-change section |
| Modify | `src/app/api/payments/route.ts` | Email block after SMS block in POST |
| Modify | `src/app/api/contact/route.ts` | Email block after SMS block in POST |
| Modify | `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx` | Email card + updated type + updated event toggle condition |
| Modify | `.env.example` | Add `TWILIO_FROM_EMAIL` |

---

## Task 1: Schema — add email fields to NotificationSettings

**Files:**
- Modify: `prisma/schema.prisma` (the `NotificationSettings` model, around line 200)

- [ ] **Step 1: Add two fields to NotificationSettings**

  Open `prisma/schema.prisma`. Find the `NotificationSettings` model (currently ends with `updatedBy String?`). Add the two new fields so the model reads:

  ```prisma
  model NotificationSettings {
    id              Int      @id @default(1)
    smsEnabled      Boolean  @default(false)
    smsPhone        String?
    emailEnabled    Boolean  @default(false)
    emailRecipients String?
    onNewOrder      Boolean  @default(true)
    onStateChange   Boolean  @default(true)
    onPayment       Boolean  @default(true)
    updatedAt       DateTime @updatedAt
    updatedBy       String?

    @@map("notification_settings")
  }
  ```

- [ ] **Step 2: Tell the user to run the migration**

  Do NOT run this yourself — the user runs it manually:
  ```bash
  npx prisma migrate dev --name add-email-notifications
  ```

  Expected output ends with:
  ```
  Your database is now in sync with your schema.
  ```

- [ ] **Step 3: Regenerate the Prisma client**

  After migration, Prisma client must be regenerated:
  ```bash
  npx prisma generate
  ```

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "feat: add emailEnabled and emailRecipients to NotificationSettings schema"
  ```

---

## Task 2: Email service + unit tests + .env.example

**Files:**
- Create: `src/services/emailService.ts`
- Create: `src/services/emailService.test.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing tests first**

  Create `src/services/emailService.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest"
  import { parseEmailRecipients } from "./emailService"

  describe("parseEmailRecipients", () => {
    it("returns empty array for null", () => {
      expect(parseEmailRecipients(null)).toEqual([])
    })
    it("returns empty array for undefined", () => {
      expect(parseEmailRecipients(undefined)).toEqual([])
    })
    it("returns empty array for empty string", () => {
      expect(parseEmailRecipients("")).toEqual([])
    })
    it("splits by comma", () => {
      expect(parseEmailRecipients("a@a.com,b@b.com")).toEqual(["a@a.com", "b@b.com"])
    })
    it("splits by newline", () => {
      expect(parseEmailRecipients("a@a.com\nb@b.com")).toEqual(["a@a.com", "b@b.com"])
    })
    it("splits by mixed comma and newline", () => {
      expect(parseEmailRecipients("a@a.com,\nb@b.com")).toEqual(["a@a.com", "b@b.com"])
    })
    it("trims whitespace from each entry", () => {
      expect(parseEmailRecipients("  a@a.com  ,  b@b.com  ")).toEqual(["a@a.com", "b@b.com"])
    })
    it("filters empty entries caused by double commas", () => {
      expect(parseEmailRecipients("a@a.com,,b@b.com")).toEqual(["a@a.com", "b@b.com"])
    })
    it("handles a single address with no delimiters", () => {
      expect(parseEmailRecipients("a@a.com")).toEqual(["a@a.com"])
    })
    it("handles whitespace-only string", () => {
      expect(parseEmailRecipients("   ")).toEqual([])
    })
  })
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  npx vitest run src/services/emailService.test.ts
  ```

  Expected: all tests FAIL with `Cannot find module './emailService'`.

- [ ] **Step 3: Create emailService.ts**

  Create `src/services/emailService.ts`:

  ```ts
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
          from,
          to: recipients.map((email) => ({ email })),
          subject,
          text: body,
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
  ```

- [ ] **Step 4: Run tests to confirm they pass**

  ```bash
  npx vitest run src/services/emailService.test.ts
  ```

  Expected: all 10 tests PASS.

- [ ] **Step 5: Add TWILIO_FROM_EMAIL to .env.example**

  Open `.env.example`. Find the `TWILIO_AUTH_TOKEN` line and add the new var directly after `TWILIO_AUTH_TOKEN`:

  ```
  TWILIO_FROM_EMAIL=          # optional — from address for email notifications
  ```

  The relevant section of `.env.example` should now read:
  ```
  TWILIO_ACCOUNT_SID=         # optional — SMS notifications
  TWILIO_AUTH_TOKEN=          # optional — SMS notifications
  TWILIO_FROM_EMAIL=          # optional — from address for email notifications
  TWILIO_PHONE_NUMBER=        # optional — SMS from number
  ```

- [ ] **Step 6: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git commit -m "feat: add emailService with sendEmail and parseEmailRecipients"
  ```

---

## Task 3: Notification settings API — add email fields

**Files:**
- Modify: `src/app/api/admin/notification-settings/route.ts`

- [ ] **Step 1: Update DEFAULT_SETTINGS and PATCH handler**

  Replace the entire file content of `src/app/api/admin/notification-settings/route.ts`:

  ```ts
  // src/app/api/admin/notification-settings/route.ts
  import { NextResponse } from "next/server"
  import { getServerSession } from "next-auth"
  import { authOptions } from "@/lib/auth"
  import { prisma } from "@/lib/prisma"

  const DEFAULT_SETTINGS = {
    smsEnabled: false,
    smsPhone: null,
    emailEnabled: false,
    emailRecipients: null,
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
    const { smsEnabled, smsPhone, emailEnabled, emailRecipients, onNewOrder, onStateChange, onPayment } = body

    const patch: Record<string, any> = { updatedBy: session.user.email ?? null }
    if (smsEnabled !== undefined) patch.smsEnabled = Boolean(smsEnabled)
    if (smsPhone !== undefined) patch.smsPhone = smsPhone || null
    if (emailEnabled !== undefined) patch.emailEnabled = Boolean(emailEnabled)
    if (emailRecipients !== undefined) patch.emailRecipients = emailRecipients || null
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
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git commit -m "feat: add emailEnabled and emailRecipients to notification settings API"
  ```

---

## Task 4: Route handler — orders/route.ts (new public quote)

**Files:**
- Modify: `src/app/api/orders/route.ts`

The SMS block in `handlePublicShopQuote` currently reads (lines ~166–174):
```ts
// SMS — fire-and-forget, never block the response
const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
if (ns?.smsEnabled && ns.onNewOrder && ns.smsPhone) {
  const customerName = `${customer.firstName} ${customer.lastName}`.trim()
  sendSms(
    ns.smsPhone,
    `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
  ).catch(() => {})
}
```

- [ ] **Step 1: Add the sendEmail import**

  At the top of `src/app/api/orders/route.ts`, add the import alongside the existing twilioService import:

  ```ts
  import { sendSms } from "@/services/twilioService"
  import { sendEmail, parseEmailRecipients } from "@/services/emailService"
  ```

- [ ] **Step 2: Add the email block after the SMS block in handlePublicShopQuote**

  Replace the SMS block (and the line immediately following it before `return NextResponse.json`) so it reads:

  ```ts
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
  ```

  Note: `customerName` was previously declared inside the SMS `if` block. Move it outside both blocks so both can use it (as shown above).

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "feat: add email notification on new public quote"
  ```

---

## Task 5: Route handler — orders/[id]/route.ts (order state change)

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

The SMS block inside `if (stateId !== undefined)` (lines ~232–239):
```ts
// SMS — fire-and-forget
const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
if (ns?.smsEnabled && ns.onStateChange && ns.smsPhone) {
  sendSms(
    ns.smsPhone,
    `Order #${orderId} moved to "${stateName}". Open dashboard to review.`,
  ).catch(() => {})
}
```

- [ ] **Step 1: Add the sendEmail import**

  At the top of `src/app/api/orders/[id]/route.ts`, add alongside the existing twilioService import:

  ```ts
  import { sendSms } from "@/services/twilioService"
  import { sendEmail, parseEmailRecipients } from "@/services/emailService"
  ```

- [ ] **Step 2: Add the email block after the SMS block**

  Replace the SMS block so it reads:

  ```ts
  // SMS — fire-and-forget
  const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
  if (ns?.smsEnabled && ns.onStateChange && ns.smsPhone) {
    sendSms(
      ns.smsPhone,
      `Order #${orderId} moved to "${stateName}". Open dashboard to review.`,
    ).catch(() => {})
  }
  // Email — fire-and-forget
  const emailRecipients = parseEmailRecipients(ns?.emailRecipients)
  if (ns?.emailEnabled && ns.onStateChange && emailRecipients.length > 0) {
    sendEmail(
      emailRecipients,
      `Order #${orderId} State Changed`,
      `Order #${orderId} moved to "${stateName}". Open dashboard to review.`,
    ).catch(() => {})
  }
  ```

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "feat: add email notification on order state change"
  ```

---

## Task 6: Route handler — payments/route.ts (payment recorded)

**Files:**
- Modify: `src/app/api/payments/route.ts`

The SMS block (lines ~49–56):
```ts
// SMS — fire-and-forget
const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
if (ns?.smsEnabled && ns.onPayment && ns.smsPhone) {
  sendSms(
    ns.smsPhone,
    `Payment of ${amountFormatted} (${channel}) recorded on Order #${orderId}.`,
  ).catch(() => {})
}
```

- [ ] **Step 1: Add the sendEmail import**

  At the top of `src/app/api/payments/route.ts`, add alongside the existing twilioService import:

  ```ts
  import { sendSms } from "@/services/twilioService"
  import { sendEmail, parseEmailRecipients } from "@/services/emailService"
  ```

- [ ] **Step 2: Add the email block after the SMS block**

  Replace the SMS block so it reads:

  ```ts
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
  ```

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "feat: add email notification on payment recorded"
  ```

---

## Task 7: Route handler — contact/route.ts (contact form)

**Files:**
- Modify: `src/app/api/contact/route.ts`

The existing SMS block fires when `settings?.smsEnabled && settings.smsPhone`. Email fires when `emailEnabled && recipients.length > 0` — no event toggle (same pattern as SMS today).

- [ ] **Step 1: Add the sendEmail import**

  At the top of `src/app/api/contact/route.ts`, add alongside the existing twilioService import:

  ```ts
  import { sendSms } from "@/services/twilioService"
  import { sendEmail, parseEmailRecipients } from "@/services/emailService"
  ```

- [ ] **Step 2: Add the email block after the SMS block inside the try**

  The existing SMS block inside the `try` reads:

  ```ts
  if (settings?.smsEnabled && settings.smsPhone) {
    // ... builds lines array ...
    const smsResult = await sendSms(settings.smsPhone, lines.join("\n"))
    if (!smsResult.data) console.warn("[contact POST] SMS not sent:", smsResult.error)
  }
  ```

  After the closing `}` of that if-block, add:

  ```ts
  // Email — fire-and-forget
  const emailRecipients = parseEmailRecipients(settings?.emailRecipients)
  if (settings?.emailEnabled && emailRecipients.length > 0) {
    // Reuse the same lines array if it was already built, otherwise build it now
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
  ```

  > **Why rebuild lines?** The SMS block only builds the `lines` array inside its own `if` scope. Rather than refactor, we rebuild for email to keep the blocks independent and the SMS block unchanged.

- [ ] **Step 3: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git commit -m "feat: add email notification on contact form submission"
  ```

---

## Task 8: Settings UI — Dashboard-SettingsView.tsx

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx`

Changes needed:
1. Add `emailEnabled` and `emailRecipients` to `NotifSettings` type
2. Add `emailRecipientsInput` state
3. Load email fields from API in the `useEffect`
4. Add `handleEmailRecipientsBlur` function
5. Add `Textarea` import
6. Add the Email card between the SMS card and the event toggles
7. Change event toggle `disabled` from `!notif.smsEnabled` to `!notif.smsEnabled && !notif.emailEnabled`
8. Update the section description and hint text

- [ ] **Step 1: Update the NotifSettings type**

  Replace:
  ```ts
  type NotifSettings = {
    smsEnabled: boolean
    smsPhone: string | null
    onNewOrder: boolean
    onStateChange: boolean
    onPayment: boolean
  }
  ```

  With:
  ```ts
  type NotifSettings = {
    smsEnabled: boolean
    smsPhone: string | null
    emailEnabled: boolean
    emailRecipients: string | null
    onNewOrder: boolean
    onStateChange: boolean
    onPayment: boolean
  }
  ```

- [ ] **Step 2: Add Textarea import**

  Add `Textarea` to the shadcn import block at the top of the file:
  ```ts
  import { Textarea } from "@/components/ui/textarea"
  ```

- [ ] **Step 3: Update initial notif state and add emailRecipientsInput state**

  Replace:
  ```ts
  const [notif, setNotif] = useState<NotifSettings>({
    smsEnabled: false,
    smsPhone: null,
    onNewOrder: true,
    onStateChange: true,
    onPayment: true,
  })
  const [notifPending, startNotifTransition] = useTransition()
  const [phoneInput, setPhoneInput] = useState("")
  ```

  With:
  ```ts
  const [notif, setNotif] = useState<NotifSettings>({
    smsEnabled: false,
    smsPhone: null,
    emailEnabled: false,
    emailRecipients: null,
    onNewOrder: true,
    onStateChange: true,
    onPayment: true,
  })
  const [notifPending, startNotifTransition] = useTransition()
  const [phoneInput, setPhoneInput] = useState("")
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("")
  ```

- [ ] **Step 4: Load email fields from the API in useEffect**

  Replace:
  ```ts
  setNotif({
    smsEnabled: data.smsEnabled,
    smsPhone: data.smsPhone,
    onNewOrder: data.onNewOrder,
    onStateChange: data.onStateChange,
    onPayment: data.onPayment,
  })
  setPhoneInput(data.smsPhone ?? "")
  ```

  With:
  ```ts
  setNotif({
    smsEnabled: data.smsEnabled,
    smsPhone: data.smsPhone,
    emailEnabled: data.emailEnabled,
    emailRecipients: data.emailRecipients,
    onNewOrder: data.onNewOrder,
    onStateChange: data.onStateChange,
    onPayment: data.onPayment,
  })
  setPhoneInput(data.smsPhone ?? "")
  setEmailRecipientsInput(data.emailRecipients ?? "")
  ```

- [ ] **Step 5: Add handleEmailRecipientsBlur function**

  Add after the existing `handlePhoneBlur` function:
  ```ts
  function handleEmailRecipientsBlur() {
    const trimmed = emailRecipientsInput.trim()
    if (trimmed === (notif.emailRecipients ?? "")) return // no change
    patchNotif({ emailRecipients: trimmed || null })
  }
  ```

- [ ] **Step 6: Update the Notifications section description**

  Replace:
  ```tsx
  <p className="text-sm text-(--color-muted) mt-0.5">
    SMS alerts sent to a single phone number when key events occur.
  </p>
  ```

  With:
  ```tsx
  <p className="text-sm text-(--color-muted) mt-0.5">
    Configure SMS and email alerts sent when key events occur.
  </p>
  ```

- [ ] **Step 7: Add the Email card after the SMS card**

  After the closing `</div>` of the SMS card (the one ending with the "E.164 format" hint), add:

  ```tsx
  {/* Email toggle + recipients */}
  <div className="rounded-lg border border-(--color-border) overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
      <div>
        <p className="text-sm font-medium text-(--color-foreground)">Email Notifications</p>
        <p className="text-xs text-(--color-muted)">Send an email when events occur</p>
      </div>
      <Switch
        checked={notif.emailEnabled}
        onCheckedChange={(checked) => patchNotif({ emailEnabled: checked })}
        disabled={notifPending}
      />
    </div>
    <div className="px-4 py-3">
      <Label htmlFor="notif-email-recipients" className="text-xs uppercase tracking-wide text-(--color-muted)">
        Send email to these addresses
      </Label>
      <Textarea
        id="notif-email-recipients"
        placeholder="you@example.com, partner@example.com"
        value={emailRecipientsInput}
        onChange={(e) => setEmailRecipientsInput(e.target.value)}
        onBlur={handleEmailRecipientsBlur}
        disabled={notifPending}
        className="mt-1.5 text-base max-w-xs resize-none"
        rows={3}
      />
      <p className="text-xs text-(--color-muted) mt-1">Enter one email per line, or separate with commas</p>
    </div>
  </div>
  ```

- [ ] **Step 8: Update the event toggle disabled condition**

  Replace (this appears in the `Switch` inside the `.map()` over event keys):
  ```tsx
  disabled={notifPending || !notif.smsEnabled}
  ```

  With:
  ```tsx
  disabled={notifPending || (!notif.smsEnabled && !notif.emailEnabled)}
  ```

- [ ] **Step 9: Update the hint text below event toggles**

  Replace:
  ```tsx
  <p className="text-xs text-(--color-muted)">
    Event toggles are disabled when SMS notifications are off.
  </p>
  ```

  With:
  ```tsx
  <p className="text-xs text-(--color-muted)">
    Event toggles are disabled when all notification channels are off.
  </p>
  ```

- [ ] **Step 10: Type-check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 11: Commit**

  ```bash
  git commit -m "feat: add email notifications card and controls to Settings UI"
  ```

---

## Task 9: Final verification

- [ ] **Step 1: Run the full test suite**

  ```bash
  npm test
  ```

  Expected: all tests PASS (including the new `emailService.test.ts`).

- [ ] **Step 2: Final type-check across all touched files**

  ```bash
  npx tsc --noEmit
  ```

  Expected: zero errors.

- [ ] **Step 3: Confirm migration was run**

  Verify the migration ran by checking for the file:
  ```bash
  ls prisma/migrations/ | grep add-email-notifications
  ```

  If it's missing, remind the user to run:
  ```bash
  npx prisma migrate dev --name add-email-notifications
  ```

---

## Post-Implementation Notes

- `TWILIO_FROM_EMAIL` must be set in `.env.local` (dev) and Vercel environment variables (prod) before email will send.
- `emailEnabled` defaults to `false` in both code and DB — no email sends until explicitly enabled in Settings.
- The Twilio account used must have email permissions enabled on the Comms API. If the `comms.twilio.com/v1/Emails` endpoint returns 404 or 403, check that the Twilio account has email API access activated.
