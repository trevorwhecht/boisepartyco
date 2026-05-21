# Admin Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify admins via SMS (Twilio) and an in-app bell icon when key order events occur (new public quote, state change, payment recorded), with global notification settings configurable from the admin Settings view.

**Architecture:** A new `NotificationSettings` singleton model stores global SMS preferences. A `twilioService.ts` helper wraps the Twilio SDK. Three existing API routes (orders POST, orders PATCH, payments POST) fire DB notifications + SMS after their core work. A `Navbar-NotificationBell.tsx` component polls for unread count and renders a dropdown. The bell mounts in `ShopHeader.tsx` (renders only for staff). Notification settings live as a new section in the existing `Dashboard-SettingsView.tsx`.

**Tech Stack:** Next.js App Router · Prisma · Twilio SDK (`twilio` npm) · next-auth v4 · shadcn/ui · Tailwind 4

---

## What Already Exists (do NOT recreate)

- `Notification` model in `prisma/schema.prisma` — `{ id, userId, orderId, type, title, message, isRead, actionUrl, actionText, createdAt, updatedAt }`
- `POST /api/orders` — already creates `Notification` rows for all admins on public order submit
- `PATCH /api/orders/[id]` — already creates `Notification` for the **customer** on state change (leave this intact; we are adding a separate admin notification alongside it)
- `Dashboard-SettingsView.tsx` — existing settings view to add a section to

---

## File Map

**New files:**
```
src/services/twilioService.ts
src/app/api/notifications/route.ts
src/app/api/admin/notification-settings/route.ts
src/components/shared/layout/Navbar-NotificationBell.tsx
```

**Modified files:**
```
prisma/schema.prisma                                          ← add NotificationSettings model
src/app/api/orders/route.ts                                   ← add SMS after admin notification create
src/app/api/orders/[id]/route.ts                              ← add admin DB notification + SMS on state change
src/app/api/payments/route.ts                                 ← add admin DB notification + SMS on payment
src/components/shared/layout/ShopHeader.tsx                   ← add <NavbarNotificationBell /> in right group
src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx  ← add notification settings section
```

---

## Task 1: Install Twilio + Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npm install twilio`
- Run: `npx prisma migrate dev --name add-notification-settings`

- [ ] **Step 1: Install the Twilio SDK**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npm install twilio
```

Expected: `twilio` appears in `package.json` dependencies.

- [ ] **Step 2: Add `NotificationSettings` model to `prisma/schema.prisma`**

Add this block immediately after the `Notification` model (after the closing `}` on the notifications `@@map` line):

```prisma
model NotificationSettings {
  id            Int      @id @default(1)
  smsEnabled    Boolean  @default(false)
  smsPhone      String?
  onNewOrder    Boolean  @default(true)
  onStateChange Boolean  @default(true)
  onPayment     Boolean  @default(true)
  updatedAt     DateTime @updatedAt
  updatedBy     String?

  @@map("notification_settings")
}
```

`@id @default(1)` means there is always exactly one row. Code uses `upsert` with `where: { id: 1 }` to read/write it.

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate dev --name add-notification-settings
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 4: Verify Prisma client regenerated**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `NotificationSettings`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations package.json package-lock.json
git commit -m "feat: add NotificationSettings schema + install twilio"
```

---

## Task 2: Twilio Service

**Files:**
- Create: `src/services/twilioService.ts`

- [ ] **Step 1: Create the service**

```ts
// src/services/twilioService.ts
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

  try {
    const client = twilio(accountSid, authToken)
    await client.messages.create({ from, to, body })
    return { data: true, error: null }
  } catch (err: any) {
    console.error("Twilio sendSms error:", err?.message ?? err)
    return { data: false, error: err?.message ?? "Unknown Twilio error" }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors in `twilioService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/twilioService.ts
git commit -m "feat: add twilioService sendSms helper"
```

---

## Task 3: Notification Settings API

**Files:**
- Create: `src/app/api/admin/notification-settings/route.ts`

`GET` returns the current global settings (creating defaults if the row doesn't exist yet). `PATCH` updates them — admin only.

- [ ] **Step 1: Create the route**

```ts
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

  const settings = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    create: DEFAULT_SETTINGS,
    update: {},
  })

  return NextResponse.json({ data: settings, error: null })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { smsEnabled, smsPhone, onNewOrder, onStateChange, onPayment } = body

  const data: Record<string, any> = { updatedBy: session.user.email ?? null }
  if (smsEnabled !== undefined) data.smsEnabled = Boolean(smsEnabled)
  if (smsPhone !== undefined) data.smsPhone = smsPhone || null
  if (onNewOrder !== undefined) data.onNewOrder = Boolean(onNewOrder)
  if (onStateChange !== undefined) data.onStateChange = Boolean(onStateChange)
  if (onPayment !== undefined) data.onPayment = Boolean(onPayment)

  const settings = await prisma.notificationSettings.upsert({
    where: { id: 1 },
    create: { ...DEFAULT_SETTINGS, ...data },
    update: data,
  })

  return NextResponse.json({ data: settings, error: null })
}
```

- [ ] **Step 2: Smoke-test the route**

Start dev server and test (you must be logged in as admin first — use browser cookies or test post-login):

```bash
curl -s http://localhost:3000/api/admin/notification-settings | jq .
```

Expected when unauthenticated: `{"data":null,"error":"Unauthorized"}`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/notification-settings/route.ts
git commit -m "feat: GET + PATCH /api/admin/notification-settings"
```

---

## Task 4: Notifications API

**Files:**
- Create: `src/app/api/notifications/route.ts`

`GET` returns the last 20 notifications for the current user plus their unread count. `PATCH` marks all as read.

- [ ] **Step 1: Create the route**

```ts
// src/app/api/notifications/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

  const userId = await prisma.user
    .findUnique({ where: { email: session.user.email! }, select: { id: true } })
    .then((u) => u?.id)

  if (!userId) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        actionUrl: true,
        orderId: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return NextResponse.json({ data: { notifications, unreadCount }, error: null })
}

export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 })

  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })

  return NextResponse.json({ data: { updated: result.count }, error: null })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notifications/route.ts
git commit -m "feat: GET + PATCH /api/notifications"
```

---

## Task 5: Wire SMS to New Public Order

**Files:**
- Modify: `src/app/api/orders/route.ts`

The existing code already creates DB `Notification` rows for all admins on public order submission. We add an SMS send alongside it, gated by `NotificationSettings`.

- [ ] **Step 1: Add imports at the top of `src/app/api/orders/route.ts`**

Find the existing import block at the top of the file and add these two lines:

```ts
import { sendSms } from "@/services/twilioService"
import { prisma as prismaClient } from "@/lib/prisma"
```

Wait — `prisma` is already imported. Just add:

```ts
import { sendSms } from "@/services/twilioService"
```

- [ ] **Step 2: Replace the existing public-order notification block**

Find this existing block (around line 213–226):

```ts
  // Notify all admins on public submission
  if (isPublic) {
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        orderId: order.id,
        type: "order_submitted",
        title: "New Quote Request",
        message: `A new quote request (#${order.id}) was submitted via the Get Quote form.`,
        actionUrl: `/dashboard`,
      })),
    })
  }
```

Replace it with:

```ts
  // Notify all admins on public submission (DB notification + optional SMS)
  if (isPublic) {
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        orderId: order.id,
        type: "order_submitted",
        title: "New Quote Request",
        message: `A new quote request (#${order.id}) was submitted via the shop.`,
        actionUrl: `/dashboard`,
      })),
    })

    // SMS — fire-and-forget, never block the response
    const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
    if (ns?.smsEnabled && ns.onNewOrder && ns.smsPhone) {
      const customerName = body.customer
        ? `${body.customer.firstName ?? ""} ${body.customer.lastName ?? ""}`.trim()
        : "a customer"
      sendSms(
        ns.smsPhone,
        `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
      ).catch(() => {})
    }
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts
git commit -m "feat: fire Twilio SMS to admin on new public order"
```

---

## Task 6: Wire Admin DB Notification + SMS to State Change

**Files:**
- Modify: `src/app/api/orders/[id]/route.ts`

The existing code creates a DB notification for the **customer** (`updated.userId`) on state change. We add a separate DB notification for **all admins** + an SMS, gated by settings.

- [ ] **Step 1: Add the sendSms import at the top of `src/app/api/orders/[id]/route.ts`**

Add alongside the existing imports:

```ts
import { sendSms } from "@/services/twilioService"
```

- [ ] **Step 2: Find the existing state-change block and extend it**

Find this existing block (around line 186–200):

```ts
  if (stateId !== undefined && updated.userId) {
    const STATE_NOTIFICATIONS: Record<number, { title: string; message: string }> = {
      2: { title: "Quote Ready to Review", message: `Your quote #${orderId} has been reviewed and is ready for your approval.` },
      3: { title: "Order In Progress", message: `We've started working on your order #${orderId}.` },
      4: { title: "Awaiting Pickup", message: `Your order #${orderId} is complete and ready for pickup!` },
      5: { title: "Awaiting Payment", message: `Your order #${orderId} is ready. Please arrange final payment before pickup.` },
      6: { title: "Order Complete", message: `Your order #${orderId} has been completed. Thank you for your business!` },
    }
    const notifData = STATE_NOTIFICATIONS[stateId as number]
    if (notifData) {
      await prisma.notification.create({
        data: { userId: updated.userId, orderId, type: "state_changed", title: notifData.title, message: notifData.message },
      }).catch(() => {})
    }
  }
```

Replace it with:

```ts
  if (stateId !== undefined) {
    // Customer notification (existing behaviour — only when order has an owner)
    if (updated.userId) {
      const STATE_NOTIFICATIONS: Record<number, { title: string; message: string }> = {
        2: { title: "Quote Ready to Review", message: `Your quote #${orderId} has been reviewed and is ready for your approval.` },
        3: { title: "Order In Progress", message: `We've started working on your order #${orderId}.` },
        4: { title: "Awaiting Pickup", message: `Your order #${orderId} is complete and ready for pickup!` },
        5: { title: "Awaiting Payment", message: `Your order #${orderId} is ready. Please arrange final payment before pickup.` },
        6: { title: "Order Complete", message: `Your order #${orderId} has been completed. Thank you for your business!` },
      }
      const notifData = STATE_NOTIFICATIONS[stateId as number]
      if (notifData) {
        await prisma.notification.create({
          data: { userId: updated.userId, orderId, type: "state_changed", title: notifData.title, message: notifData.message },
        }).catch(() => {})
      }
    }

    // Admin notification — always, regardless of whether order has a user
    const stateName = updated.state?.name ?? `State ${stateId}`
    const adminNotifTitle = `Order #${orderId} → ${stateName}`
    const adminNotifMessage = `Order #${orderId} was moved to "${stateName}"${updated.user ? ` (${updated.user.firstName} ${updated.user.lastName})` : ""}.`

    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          orderId,
          type: "state_changed",
          title: adminNotifTitle,
          message: adminNotifMessage,
          actionUrl: `/dashboard`,
        })),
      }).catch(() => {})
    }

    // SMS — fire-and-forget
    const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
    if (ns?.smsEnabled && ns.onStateChange && ns.smsPhone) {
      sendSms(
        ns.smsPhone,
        `Order #${orderId} moved to "${stateName}". Open dashboard to review.`,
      ).catch(() => {})
    }
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/orders/[id]/route.ts"
git commit -m "feat: admin DB notification + SMS on order state change"
```

---

## Task 7: Wire Admin DB Notification + SMS to Payment

**Files:**
- Modify: `src/app/api/payments/route.ts`

Currently the payment route creates a payment and returns — no notification. We add a DB notification for all admins + an optional SMS.

- [ ] **Step 1: Add imports to `src/app/api/payments/route.ts`**

Add alongside existing imports:

```ts
import { sendSms } from "@/services/twilioService"
```

- [ ] **Step 2: Replace the return statement with notification logic**

Find the existing return at the end of the `POST` handler:

```ts
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
  return NextResponse.json({ data: { ...payment, amount: Number(payment.amount) }, error: null }, { status: 201 })
```

Replace with:

```ts
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

  return NextResponse.json({ data: { ...payment, amount: Number(payment.amount) }, error: null }, { status: 201 })
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/payments/route.ts
git commit -m "feat: admin DB notification + SMS on payment recorded"
```

---

## Task 8: Bell Icon Component

**Files:**
- Create: `src/components/shared/layout/Navbar-NotificationBell.tsx`

Self-contained component. Uses `useSession` to render only for staff. Polls unread count every 30 s. Opens a dropdown on click showing last 20 notifications. "Mark all read" button calls `PATCH /api/notifications`.

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/layout/Navbar-NotificationBell.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  orderId: number | null
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NavbarNotificationBell() {
  const { data: session } = useSession()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const role = session?.user?.role
  const isStaff = role === "admin" || role === "employee"

  const fetchCount = useCallback(async () => {
    if (!isStaff) return
    try {
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data) setUnreadCount(json.data.unreadCount)
    } catch {
      // network error — ignore, keep showing stale count
    }
  }, [isStaff])

  // Poll every 30s for unread count
  useEffect(() => {
    if (!isStaff) return
    fetchCount()
    intervalRef.current = setInterval(fetchCount, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isStaff, fetchCount])

  async function handleOpen() {
    if (isOpen) { setIsOpen(false); return }
    setIsOpen(true)
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data) {
        setNotifications(json.data.notifications)
        setUnreadCount(json.data.unreadCount)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  if (!isStaff) return null

  const badgeCount = unreadCount > 9 ? "9+" : unreadCount

  return (
    <div style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        style={{
          minHeight: 44,
          minWidth: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--shop-ink)",
          touchAction: "manipulation",
          position: "relative",
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "#e53e3e",
              color: "#fff",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              padding: unreadCount > 9 ? "2px 4px" : "2px 5px",
              minWidth: 16,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {badgeCount}
          </span>
        ) : null}
      </button>

      {/* Backdrop */}
      {isOpen ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 35 }}
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {/* Dropdown */}
      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 480,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid var(--shop-line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 40,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--shop-line)",
          }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--shop-ink)" }}>Notifications</span>
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 12,
                  color: "var(--shop-blue)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  touchAction: "manipulation",
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--shop-ink-soft)" }}>
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--shop-ink-soft)" }}>
              No notifications yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--shop-line)",
                    background: n.isRead ? "#fff" : "var(--shop-blue-soft)",
                    cursor: n.actionUrl ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (n.actionUrl) {
                      setIsOpen(false)
                      window.location.href = n.actionUrl
                    }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--shop-ink)", lineHeight: 1.3 }}>
                      {n.title}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--shop-ink-soft)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--shop-ink-soft)", lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/layout/Navbar-NotificationBell.tsx
git commit -m "feat: notification bell icon with dropdown + unread badge"
```

---

## Task 9: Wire Bell into ShopHeader

**Files:**
- Modify: `src/components/shared/layout/ShopHeader.tsx`

Add the bell button in the right group, immediately before the account icon button. The component renders `null` for non-staff users so no conditional logic is needed here.

- [ ] **Step 1: Add the import to `ShopHeader.tsx`**

Find the existing import block and add:

```ts
import NavbarNotificationBell from "@/components/shared/layout/Navbar-NotificationBell"
```

- [ ] **Step 2: Add the bell in the right group**

Find the right group `<div>` that contains the account icon button. It currently looks like:

```tsx
            {/* Right group: desktop (date + quote) + account icon (both) */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {/* Date picker + Quote button — desktop only */}
              <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
                <DateRangeField start={start} end={end} onChange={handleDateChange} compact />
                <QuoteButton cartCount={cartCount} onClick={closeAll} />
              </div>

              {/* Account icon — both mobile and desktop */}
              <button
```

Add `<NavbarNotificationBell />` immediately before the account icon button:

```tsx
            {/* Right group: desktop (date + quote) + account icon (both) */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {/* Date picker + Quote button — desktop only */}
              <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
                <DateRangeField start={start} end={end} onChange={handleDateChange} compact />
                <QuoteButton cartCount={cartCount} onClick={closeAll} />
              </div>

              {/* Notification bell — renders only for logged-in staff */}
              <NavbarNotificationBell />

              {/* Account icon — both mobile and desktop */}
              <button
```

- [ ] **Step 3: Manual smoke test**

1. `npm run dev`
2. Log in as admin → confirm bell icon appears next to the user icon in the header
3. Confirm bell does **not** appear when signed out
4. Click bell → confirm dropdown opens showing "No notifications yet."
5. Submit a test public order via `/quote` → confirm:
   - Bell badge shows `1`
   - Dropdown lists the new quote notification
   - "Mark all read" clears the badge
6. Log in as employee → confirm bell appears
7. Log out → confirm bell is gone

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/layout/ShopHeader.tsx
git commit -m "feat: notification bell wired into ShopHeader"
```

---

## Task 10: Notification Settings UI

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx`

Add a "Notifications" section (admin only) below the existing Employee Permissions section. Reads from `GET /api/admin/notification-settings`, saves on toggle/change via `PATCH`.

- [ ] **Step 1: Add the Notifications section to `Dashboard-SettingsView.tsx`**

The full updated file (replace entirely):

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useSession } from "next-auth/react"
import DashboardSettingsViewSetupFeePresets from "./Dashboard-SettingsView-SetupFeePresets"

type Access = "none" | "view" | "edit"

type NotifSettings = {
  smsEnabled: boolean
  smsPhone: string | null
  onNewOrder: boolean
  onStateChange: boolean
  onPayment: boolean
}

const ACCESS_KEYS = [
  { key: "employeeLineItemPriceAccess", label: "Line Item Price", description: "Whether employees can see / edit the unit price on order line items" },
  { key: "employeeLineItemCostAccess", label: "Line Item Cost", description: "Whether employees can see / edit the unit cost on order line items" },
  { key: "employeeSetupCostAccess", label: "Setup Cost (Cost Column)", description: "Whether employees can see / edit the internal cost on setup cost rows" },
] as const

export default function DashboardSettingsView() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  const [permissions, setPermissions] = useState<Record<string, Access>>({
    employeeLineItemPriceAccess: "view",
    employeeLineItemCostAccess: "none",
    employeeSetupCostAccess: "edit",
  })
  const [isPending, startTransition] = useTransition()

  // Notification settings state
  const [notif, setNotif] = useState<NotifSettings>({
    smsEnabled: false,
    smsPhone: null,
    onNewOrder: true,
    onStateChange: true,
    onPayment: true,
  })
  const [notifPending, startNotifTransition] = useTransition()
  const [phoneInput, setPhoneInput] = useState("")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        setPermissions((prev) => {
          const next = { ...prev }
          for (const item of data) {
            if (item.setting in next) next[item.setting] = item.value as Access
          }
          return next
        })
      })
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetch("/api/admin/notification-settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        setNotif({
          smsEnabled: data.smsEnabled,
          smsPhone: data.smsPhone,
          onNewOrder: data.onNewOrder,
          onStateChange: data.onStateChange,
          onPayment: data.onPayment,
        })
        setPhoneInput(data.smsPhone ?? "")
      })
  }, [isAdmin])

  function handleAccessChange(key: string, value: Access) {
    const prev = permissions[key]
    setPermissions((p) => ({ ...p, [key]: value }))
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting: key, value }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        setPermissions((p) => ({ ...p, [key]: prev as Access }))
      }
    })
  }

  function patchNotif(patch: Partial<NotifSettings>) {
    setNotif((prev) => ({ ...prev, ...patch }))
    startNotifTransition(async () => {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (json.error) toast.error(json.error)
    })
  }

  function handlePhoneBlur() {
    const trimmed = phoneInput.trim()
    if (trimmed === (notif.smsPhone ?? "")) return // no change
    patchNotif({ smsPhone: trimmed || null })
  }

  return (
    <div className="p-6 max-w-4xl space-y-10">
      <h2 className="text-xl font-semibold text-(--color-foreground)">Settings</h2>
      <DashboardSettingsViewSetupFeePresets />

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-(--color-foreground)">Employee Permissions</h3>
          <p className="text-sm text-(--color-muted) mt-0.5">Control what employees can see and edit in the quote builder.</p>
        </div>
        <div className="rounded-lg border border-(--color-border) overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface)">
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Field</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted) w-36">Access</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_KEYS.map(({ key, label, description }) => (
                <tr key={key} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3 font-medium text-(--color-foreground) whitespace-nowrap">{label}</td>
                  <td className="px-4 py-3 text-(--color-muted) text-xs">{description}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={permissions[key] ?? "none"}
                      onValueChange={(v) => handleAccessChange(key, v as Access)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-28 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-(--color-background)">
                        <SelectItem value="none">Hidden</SelectItem>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="edit">Editable</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-(--color-muted)">
          <strong>Hidden</strong> — field stripped from API response and not shown in UI. &nbsp;
          <strong>View Only</strong> — visible but read-only. &nbsp;
          <strong>Editable</strong> — fully editable.
        </p>
      </div>

      {isAdmin ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-(--color-foreground)">Notifications</h3>
            <p className="text-sm text-(--color-muted) mt-0.5">
              SMS alerts sent to a single phone number when key events occur.
            </p>
          </div>

          {/* SMS toggle + phone */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
              <div>
                <p className="text-sm font-medium text-(--color-foreground)">SMS Notifications</p>
                <p className="text-xs text-(--color-muted)">Send a text message when events occur</p>
              </div>
              <Switch
                checked={notif.smsEnabled}
                onCheckedChange={(checked) => patchNotif({ smsEnabled: checked })}
                disabled={notifPending}
              />
            </div>
            <div className="px-4 py-3">
              <Label htmlFor="notif-phone" className="text-xs uppercase tracking-wide text-(--color-muted)">
                Send SMS to this number
              </Label>
              <Input
                id="notif-phone"
                type="tel"
                inputMode="tel"
                placeholder="+12085551234"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={handlePhoneBlur}
                disabled={notifPending}
                className="mt-1.5 text-base max-w-xs"
              />
              <p className="text-xs text-(--color-muted) mt-1">E.164 format — e.g. +12085551234</p>
            </div>
          </div>

          {/* Event toggles */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden divide-y divide-(--color-border)">
            {[
              { key: "onNewOrder" as const, label: "New public quote", description: "Customer submits a quote request via the shop" },
              { key: "onStateChange" as const, label: "Order state change", description: "An order is moved to a new status" },
              { key: "onPayment" as const, label: "Payment recorded", description: "A payment is logged on an order" },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-(--color-foreground)">{label}</p>
                  <p className="text-xs text-(--color-muted)">{description}</p>
                </div>
                <Switch
                  checked={notif[key]}
                  onCheckedChange={(checked) => patchNotif({ [key]: checked })}
                  disabled={notifPending || !notif.smsEnabled}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-(--color-muted)">
            Event toggles are disabled when SMS notifications are off.
          </p>
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Manual smoke test**

1. Log in as admin → navigate to Settings
2. Confirm "Notifications" section appears below Employee Permissions
3. Toggle SMS Notifications on → confirm switch saves (no error toast)
4. Enter your Twilio `TO` number in the phone field → tab/blur → confirm it saves
5. Toggle "New public quote" on
6. Submit a test order via `/quote` → confirm SMS arrives on your phone
7. Log in as employee → confirm Notifications section is hidden

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx
git commit -m "feat: notification settings section in admin Settings view"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Bell icon on user icon area in header | Task 9 |
| Unread badge count | Task 8 |
| Dropdown with recent notifications | Task 8 |
| Mark all read | Task 8 + Task 4 |
| Twilio SMS on new public order | Task 5 |
| Twilio SMS on state change | Task 6 |
| Twilio SMS on payment recorded | Task 7 |
| Admin DB notification on state change | Task 6 |
| Admin DB notification on payment | Task 7 |
| Settings section: SMS toggle + phone | Task 10 |
| Settings section: event checkboxes | Task 10 |
| `NotificationSettings` global singleton | Task 1 |
| `sendSms` helper with graceful fallback | Task 2 |
| Bell hidden for non-staff | Task 8 (`useSession` guard) |
| Event toggles disabled when SMS off | Task 10 |
| SMS fire-and-forget (never blocks API response) | Tasks 5, 6, 7 |

All requirements covered. ✓
