# User Account — Orders Page & Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `/account` page with `/account/orders` (visual order cards, current/completed split) and `/account/settings` (profile editing + notification preferences) for authenticated non-staff users.

**Architecture:** `/account` becomes a redirect to `/account/orders`. Orders page is server-rendered (Prisma query in page.tsx) with a client container for toggle state. Settings page is server-rendered with client form components. A new `PATCH /api/users/me` handles all self-service profile edits; the existing `PATCH /api/users/[id]` stays admin-only and untouched. Schema gets a `guests Int?` field on Order.

**Tech Stack:** Next.js App Router, Prisma, NextAuth v4, Tailwind 4, shadcn/ui, bcryptjs, date-fns

---

## File Map

**Create:**
- `src/app/(app)/account/orders/page.tsx` — server component, Prisma fetch, renders Orders
- `src/app/(app)/account/orders/Orders.tsx` — client container, current/completed toggle state
- `src/app/(app)/account/orders/components/Orders-Card.tsx` — single order card, desktop + mobile layout
- `src/app/(app)/account/settings/page.tsx` — server component, Prisma fetch, renders Settings
- `src/app/(app)/account/settings/Settings.tsx` — server component wrapper (no state, just layout)
- `src/app/(app)/account/settings/components/Settings-Profile.tsx` — editable profile fields + password dialog
- `src/app/(app)/account/settings/components/Settings-Notifications.tsx` — consent toggles with debounced save
- `src/app/api/users/me/route.ts` — PATCH endpoint for self-editing (profile, password, address, consent)

**Modify:**
- `prisma/schema.prisma` — add `guests Int?` to Order model
- `src/app/(app)/account/page.tsx` — replace entirely with a redirect to `/account/orders`
- `src/components/shared/layout/Navbar-AccountPanel.tsx` — update "Orders" nav link from `/account` → `/account/orders`

**Delete:**
- `src/app/(app)/account/Account.tsx`
- `src/app/(app)/account/components/Account-OrderList.tsx`
- `src/app/(app)/account/components/Account-ResellerLicense.tsx`

---

## Task 1: Schema Migration — Add `guests` to Order

**Files:**
- Modify: `prisma/schema.prisma`
- Run migration via `/migrate-dev`

- [ ] **Step 1: Add the field to schema**

In `prisma/schema.prisma`, inside `model Order {`, after the `dueDateEnd` field (line ~97), insert:

```prisma
  guests          Int?
```

The surrounding context for exact placement:
```prisma
  dueDate         DateTime?
  dueDateEnd      DateTime?
  guests          Int?
  startDate       DateTime?
```

- [ ] **Step 2: Run the migration**

Run the slash command:
```
/migrate-dev
```

When prompted, name the migration: `add_order_guests_field`

Expected: Prisma creates `prisma/migrations/YYYYMMDDHHMMSS_add_order_guests_field/migration.sql` with `ALTER TABLE "Order" ADD COLUMN "guests" INTEGER;`

- [ ] **Step 3: Verify Prisma client regenerated**

Run:
```bash
npx prisma generate
```

Expected: `Generated Prisma Client` output with no errors.

---

## Task 2: API — PATCH /api/users/me

**Files:**
- Create: `src/app/api/users/me/route.ts`

This endpoint lets a logged-in user edit their own profile. The existing `PATCH /api/users/[id]` is admin-only (role changes only) and stays untouched.

- [ ] **Step 1: Create the route file**

Create `src/app/api/users/me/route.ts`:

```typescript
import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { firstName, lastName, email, phone, companyName, consentSms, consentEmail, password, address } = body

  const updateData: Record<string, any> = {}
  if (firstName !== undefined) updateData.firstName = firstName
  if (lastName !== undefined) updateData.lastName = lastName
  if (email !== undefined) updateData.email = email
  if (phone !== undefined) updateData.phone = phone || null
  if (companyName !== undefined) updateData.companyName = companyName || null
  if (consentSms !== undefined) updateData.consentSms = consentSms
  if (consentEmail !== undefined) updateData.consentEmail = consentEmail

  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ data: null, error: "Password must be at least 8 characters" }, { status: 400 })
    }
    updateData.password = await hash(password, 12)
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        consentSms: true,
        consentEmail: true,
      },
    })

    if (address) {
      if (address.id) {
        const existingAddr = await prisma.address.findFirst({
          where: { id: address.id, userId: session.user.id },
        })
        if (existingAddr) {
          await prisma.address.update({
            where: { id: address.id },
            data: {
              street: address.street,
              city: address.city,
              state: address.state,
              zipCode: address.zipCode,
            },
          })
        }
      } else {
        await prisma.address.create({
          data: {
            userId: session.user.id,
            street: address.street,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
            label: "primary",
          },
        })
      }
    }

    return NextResponse.json({ data: user, error: null })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ data: null, error: "Email already in use" }, { status: 409 })
    }
    return NextResponse.json({ data: null, error: "Failed to update profile" }, { status: 500 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors in the new file.

---

## Task 3: Orders-Card Component

**Files:**
- Create: `src/app/(app)/account/orders/components/Orders-Card.tsx`

The card renders both desktop (horizontal) and mobile (stacked) layouts. `date-fns` is already installed.

- [ ] **Step 1: Create the component**

Create `src/app/(app)/account/orders/components/Orders-Card.tsx`:

```tsx
"use client"

import Link from "next/link"
import { format, getYear } from "date-fns"
import { CalendarDays, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type OrderCardData = {
  id: number
  token: string | null
  nickname: string | null
  stateId: number
  state: { name: string; color: string | null }
  dueDate: Date | null
  dueDateEnd: Date | null
  guests: number | null
  totalPrice: any
  _count: { orderLineItems: number }
  orderLineItems: Array<{
    item: { primaryImageUrl: string | null } | null
    tentConfig: { primaryImageUrl: string | null } | null
  }>
}

function formatDateRange(dueDate: Date | null, dueDateEnd: Date | null): string | null {
  if (!dueDate) return null
  if (!dueDateEnd) return format(dueDate, "MMM d")
  const currentYear = getYear(new Date())
  const endYear = getYear(dueDateEnd)
  if (endYear !== currentYear) {
    return `${format(dueDate, "MMM d")}–${format(dueDateEnd, "MMM d, yyyy")}`
  }
  return `${format(dueDate, "MMM d")}–${format(dueDateEnd, "MMM d")}`
}

export default function OrdersCard({ order }: { order: OrderCardData }) {
  const href =
    order.stateId <= 2 || !order.token
      ? `/quote-builder?orderId=${order.id}`
      : `/orders/${order.token}`

  const thumbnail =
    order.orderLineItems[0]?.item?.primaryImageUrl ??
    order.orderLineItems[0]?.tentConfig?.primaryImageUrl ??
    null

  const dateRange = formatDateRange(order.dueDate, order.dueDateEnd)
  const itemCount = order._count.orderLineItems
  const total = `$${Number(order.totalPrice).toFixed(2)}`
  const badgeStyle = {
    borderColor: order.state.color ?? undefined,
    color: order.state.color ?? undefined,
  }
  const label = order.nickname ?? `Order #${order.id}`

  return (
    <Link href={href} className="block group">
      {/* Desktop: horizontal card (md+) */}
      <div className="hidden md:flex items-stretch rounded-lg border border-(--color-border) bg-(--color-background) group-hover:bg-(--color-surface) transition-colors motion-reduce:transition-none overflow-hidden">
        <div className="w-[110px] flex-shrink-0 bg-(--color-surface)">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-(--color-surface)" />
          )}
        </div>
        <div className="flex-1 px-4 py-3 flex flex-col justify-center gap-1.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-(--color-foreground) truncate">{label}</p>
              <p className="text-xs text-(--color-muted)">Order #{order.id}</p>
            </div>
            <Badge variant="outline" style={badgeStyle} className="flex-shrink-0">
              {order.state.name}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-(--color-muted) flex-wrap">
            {dateRange ? (
              <span className="flex items-center gap-1">
                <CalendarDays size={13} />
                {dateRange}
              </span>
            ) : null}
            {order.guests ? (
              <span className="flex items-center gap-1">
                <Users size={13} />
                {order.guests} guests
              </span>
            ) : null}
            <span>
              {itemCount} {itemCount === 1 ? "item" : "items"} · {total}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile: stacked card (<md) */}
      <div className="flex md:hidden flex-col rounded-lg border border-(--color-border) bg-(--color-background) group-hover:bg-(--color-surface) transition-colors motion-reduce:transition-none overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3">
          <p className="text-sm font-medium text-(--color-muted)">Order #{order.id}</p>
          <Badge variant="outline" style={badgeStyle}>
            {order.state.name}
          </Badge>
        </div>
        <div className="mx-auto mt-3 w-20 h-20 rounded overflow-hidden bg-(--color-surface)">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : null}
        </div>
        <div className="px-3 pb-3 pt-2 space-y-1">
          <p className="font-semibold text-(--color-foreground) text-sm">{label}</p>
          {dateRange ? (
            <p className="text-xs text-(--color-muted) flex items-center gap-1">
              <CalendarDays size={12} />
              {dateRange}
            </p>
          ) : null}
          {order.guests ? (
            <p className="text-xs text-(--color-muted) flex items-center gap-1">
              <Users size={12} />
              {order.guests} guests
            </p>
          ) : null}
          <p className="text-xs text-(--color-muted)">
            {itemCount} {itemCount === 1 ? "item" : "items"} · {total}
          </p>
        </div>
      </div>
    </Link>
  )
}
```

---

## Task 4: Orders Container + Page

**Files:**
- Create: `src/app/(app)/account/orders/Orders.tsx`
- Create: `src/app/(app)/account/orders/page.tsx`

- [ ] **Step 1: Create the Orders container**

Create `src/app/(app)/account/orders/Orders.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import OrdersCard, { type OrderCardData } from "./components/Orders-Card"

type Props = { orders: OrderCardData[] }

export default function Orders({ orders }: Props) {
  const current = orders.filter(o => o.stateId >= 1 && o.stateId <= 5)
  const completed = orders.filter(o => o.stateId === 6)
  const hasBoth = current.length > 0 && completed.length > 0
  const [activeTab, setActiveTab] = useState<"current" | "completed">("current")

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-(--color-foreground) mb-6">My Orders</h1>
        <div className="rounded-lg border border-(--color-border) bg-(--color-background) px-4 py-12 text-center space-y-3">
          <p className="text-(--color-muted)">No orders yet.</p>
          <Link href="/quote" className="text-sm underline text-(--color-primary)">
            Start a quote
          </Link>
        </div>
      </div>
    )
  }

  const visible = hasBoth
    ? activeTab === "current" ? current : completed
    : current.length > 0 ? current : completed
  const heading = hasBoth
    ? null
    : current.length > 0 ? "Current Orders" : "Completed Orders"

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {hasBoth ? (
        <div className="flex items-center gap-1 bg-(--color-surface) rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("current")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none touch-manipulation ${
              activeTab === "current"
                ? "bg-(--color-background) text-(--color-foreground) shadow-sm"
                : "text-(--color-muted) hover:text-(--color-foreground)"
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none touch-manipulation ${
              activeTab === "completed"
                ? "bg-(--color-background) text-(--color-foreground) shadow-sm"
                : "text-(--color-muted) hover:text-(--color-foreground)"
            }`}
          >
            Completed
          </button>
        </div>
      ) : (
        <h1 className="text-2xl font-bold text-(--color-foreground)">{heading}</h1>
      )}
      <div className="space-y-3">
        {visible.map(order => (
          <OrdersCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the page server component**

Create `src/app/(app)/account/orders/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Orders from "./Orders"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?redirect=/account/orders")

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, stateId: { not: 0 } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      nickname: true,
      stateId: true,
      state: { select: { name: true, color: true } },
      dueDate: true,
      dueDateEnd: true,
      guests: true,
      totalPrice: true,
      _count: { select: { orderLineItems: true } },
      orderLineItems: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: {
          item: { select: { primaryImageUrl: true } },
          tentConfig: { select: { primaryImageUrl: true } },
        },
      },
    },
  })

  return <Orders orders={orders} />
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors from the new files.

---

## Task 5: Settings-Notifications Component

**Files:**
- Create: `src/app/(app)/account/settings/components/Settings-Notifications.tsx`

Reuses `QuotePage-ConsentToggles` with `hideAccount` prop (which already exists on the component). The `ConsentValue` type has an `account` key that we keep as `false` always.

- [ ] **Step 1: Create the component**

Create `src/app/(app)/account/settings/components/Settings-Notifications.tsx`:

```tsx
"use client"

import { useState, useRef } from "react"
import { toast } from "sonner"
import QuotePageConsentToggles, {
  type ConsentValue,
} from "@/app/(public)/quote/components/QuotePage-ConsentToggles"

type Props = {
  initialSms: boolean
  initialEmail: boolean
}

export default function SettingsNotifications({ initialSms, initialEmail }: Props) {
  const [consent, setConsent] = useState<ConsentValue>({
    sms: initialSms,
    email: initialEmail,
    account: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(v: ConsentValue) {
    setConsent(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentSms: v.sms, consentEmail: v.email }),
      })
      const json = await res.json()
      if (json.error) toast.error(json.error)
    }, 600)
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-background) p-4 space-y-3">
      <h2 className="text-base font-semibold text-(--color-foreground)">Notifications</h2>
      <QuotePageConsentToggles value={consent} onChange={handleChange} hideAccount />
    </div>
  )
}
```

---

## Task 6: Settings-Profile Component

**Files:**
- Create: `src/app/(app)/account/settings/components/Settings-Profile.tsx`

Contains the profile form and the password-change dialog (moved here from `Account.tsx`). Address section always shows — empty fields if no address exists.

- [ ] **Step 1: Create the component**

Create `src/app/(app)/account/settings/components/Settings-Profile.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Address = {
  id: string
  street: string
  city: string
  state: string
  zipCode: string
} | null

type Props = {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    companyName: string | null
  }
  address: Address
}

export default function SettingsProfile({ user, address }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isPwPending, startPwTransition] = useTransition()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const street = (form.get("street") as string).trim()

    const body: Record<string, any> = {
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || null,
      companyName: (form.get("companyName") as string) || null,
    }

    if (street) {
      body.address = {
        id: address?.id,
        street,
        city: form.get("city") as string,
        state: form.get("state") as string,
        zipCode: form.get("zipCode") as string,
      }
    }

    startTransition(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      toast.success("Profile saved.")
    })
  }

  function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwError(null)
    const form = new FormData(e.currentTarget)
    const password = form.get("password") as string
    const confirm = form.get("confirm") as string
    if (password !== confirm) { setPwError("Passwords do not match."); return }
    if (password.length < 8) { setPwError("Password must be at least 8 characters."); return }

    startPwTransition(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.error) { setPwError(json.error); return }
      toast.success("Password updated.")
      setShowPasswordDialog(false)
    })
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-background) p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-(--color-foreground)">Profile</h2>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => { setPwError(null); setShowPasswordDialog(true) }}
        >
          Change Password
        </Button>
      </div>

      <form onSubmit={handleProfileSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" id="sp-firstName">
            <Input
              id="sp-firstName"
              name="firstName"
              defaultValue={user.firstName}
              required
              autoComplete="given-name"
              className="text-base"
            />
          </Field>
          <Field label="Last Name" id="sp-lastName">
            <Input
              id="sp-lastName"
              name="lastName"
              defaultValue={user.lastName}
              required
              autoComplete="family-name"
              className="text-base"
            />
          </Field>
        </div>

        <Field label="Email" id="sp-email">
          <Input
            id="sp-email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={user.email}
            required
            autoComplete="email"
            className="text-base"
          />
        </Field>

        <Field label="Phone" id="sp-phone">
          <Input
            id="sp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={user.phone ?? ""}
            autoComplete="tel"
            className="text-base"
          />
        </Field>

        <Field label="Company (optional)" id="sp-company">
          <Input
            id="sp-company"
            name="companyName"
            defaultValue={user.companyName ?? ""}
            autoComplete="organization"
            className="text-base"
          />
        </Field>

        <div className="pt-2 border-t border-(--color-border) space-y-3">
          <p className="text-sm font-medium text-(--color-foreground)">
            {address ? "Address" : "Address (optional)"}
          </p>
          <Field label="Street" id="sp-street">
            <Input
              id="sp-street"
              name="street"
              defaultValue={address?.street ?? ""}
              autoComplete="street-address"
              className="text-base"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" id="sp-city">
              <Input
                id="sp-city"
                name="city"
                defaultValue={address?.city ?? ""}
                autoComplete="address-level2"
                className="text-base"
              />
            </Field>
            <Field label="State" id="sp-state">
              <Input
                id="sp-state"
                name="state"
                defaultValue={address?.state ?? ""}
                autoComplete="address-level1"
                className="text-base"
              />
            </Field>
          </div>
          <Field label="Zip Code" id="sp-zip">
            <Input
              id="sp-zip"
              name="zipCode"
              inputMode="numeric"
              defaultValue={address?.zipCode ?? ""}
              autoComplete="postal-code"
              className="text-base"
            />
          </Field>
        </div>

        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-(--color-background)">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-3">
            <Field label="New Password" id="sp-pw">
              <div className="relative">
                <Input
                  id="sp-pw"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="text-base pr-10"
                />
                <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
              </div>
            </Field>
            <Field label="Confirm Password" id="sp-pw-confirm">
              <div className="relative">
                <Input
                  id="sp-pw-confirm"
                  name="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="text-base pr-10"
                />
                <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} />
              </div>
            </Field>
            {pwError ? (
              <p className="text-sm text-(--color-danger)" role="alert">
                {pwError}
              </p>
            ) : null}
            <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" type="button" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button autoFocus type="submit" disabled={isPwPending} className="gap-2">
                {isPwPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPwPending ? "Saving…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted) hover:text-(--color-foreground)"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}
```

---

## Task 7: Settings Container + Page

**Files:**
- Create: `src/app/(app)/account/settings/Settings.tsx`
- Create: `src/app/(app)/account/settings/page.tsx`

- [ ] **Step 1: Create the Settings container**

`Settings.tsx` is a server component — it just composes the two client child components.

Create `src/app/(app)/account/settings/Settings.tsx`:

```tsx
import SettingsProfile from "./components/Settings-Profile"
import SettingsNotifications from "./components/Settings-Notifications"

type Address = {
  id: string
  street: string
  city: string
  state: string
  zipCode: string
} | null

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  companyName: string | null
  consentSms: boolean
  consentEmail: boolean
  addresses: Array<{ id: string; street: string; city: string; state: string; zipCode: string }>
}

type Props = { user: User }

export default function Settings({ user }: Props) {
  const address: Address = user.addresses[0] ?? null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-(--color-foreground)">Account Settings</h1>
      <SettingsProfile
        user={{
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
        }}
        address={address}
      />
      <SettingsNotifications initialSms={user.consentSms} initialEmail={user.consentEmail} />
    </div>
  )
}
```

- [ ] **Step 2: Create the page server component**

Create `src/app/(app)/account/settings/page.tsx`:

```tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Settings from "./Settings"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?redirect=/account/settings")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      consentSms: true,
      consentEmail: true,
      addresses: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { id: true, street: true, city: true, state: true, zipCode: true },
      },
    },
  })

  if (!user) redirect("/login")

  return <Settings user={user} />
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors from the new settings files.

---

## Task 8: Route Cleanup, Navbar Update, Delete Old Files

**Files:**
- Modify: `src/app/(app)/account/page.tsx`
- Modify: `src/components/shared/layout/Navbar-AccountPanel.tsx`
- Delete: `src/app/(app)/account/Account.tsx`
- Delete: `src/app/(app)/account/components/Account-OrderList.tsx`
- Delete: `src/app/(app)/account/components/Account-ResellerLicense.tsx`

- [ ] **Step 1: Replace /account/page.tsx with a redirect**

Replace the entire contents of `src/app/(app)/account/page.tsx` with:

```tsx
import { redirect } from "next/navigation"

export default function AccountPage() {
  redirect("/account/orders")
}
```

- [ ] **Step 2: Update the navbar Orders link**

In `src/components/shared/layout/Navbar-AccountPanel.tsx`, find the PanelItem for "Orders" (line ~152) — it currently navigates to `/account`. Change it to `/account/orders`:

Old:
```tsx
<PanelItem icon={<LayoutGrid className="h-4 w-4" />} onClick={() => navigate("/account")}>Orders</PanelItem>
```

New:
```tsx
<PanelItem icon={<LayoutGrid className="h-4 w-4" />} onClick={() => navigate("/account/orders")}>Orders</PanelItem>
```

- [ ] **Step 3: Delete the three old account files**

```bash
rm src/app/\(app\)/account/Account.tsx
rm src/app/\(app\)/account/components/Account-OrderList.tsx
rm src/app/\(app\)/account/components/Account-ResellerLicense.tsx
```

- [ ] **Step 4: Verify the components directory is now empty and can be removed if desired**

```bash
ls src/app/\(app\)/account/components/
```

Expected: Directory is empty (all three files deleted). If empty, remove it:
```bash
rmdir src/app/\(app\)/account/components/
```

- [ ] **Step 5: Full type-check**

```bash
npx tsc --noEmit
```

Expected: Zero errors. If errors appear in files that were not touched, note them explicitly but do not fix them — flag to the user.

- [ ] **Step 6: Build verification**

```bash
npm run build
```

Expected: Build completes with no errors. The three new routes (`/account`, `/account/orders`, `/account/settings`) should appear in the route output.
