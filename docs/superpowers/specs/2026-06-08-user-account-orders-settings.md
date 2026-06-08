# User Account — Orders Page & Settings Page

**Date:** 2026-06-08  
**Branch:** finishQuoteBuild

---

## Overview

Two user-facing pages for authenticated non-staff users:

1. **`/account/orders`** — Order history with visual cards (current/completed split)
2. **`/account/settings`** — Profile editing + notification opt-in

The existing `/account` route redirects to `/account/orders`. The reseller license section is removed entirely. The existing `Account.tsx` and `Account-OrderList.tsx` are replaced, not kept.

---

## Schema Addition

One new optional field required on `Order`:

```prisma
guests Int?   // optional guest count entered by the customer
```

Migration required before implementation. Entry point for the guest count (date picker header, quote flow, etc.) is tracked separately — this spec only covers displaying it on the card and accepting it via the API.

---

## 1. Route Changes

| Route | Before | After |
|---|---|---|
| `/account` | Orders table (Account.tsx) | Redirect → `/account/orders` |
| `/account/orders` | Does not exist | **New** — order cards page |
| `/account/settings` | Does not exist | **New** — profile + notifications |

Navbar `Orders` link updated from `/account` → `/account/orders` (in `Navbar-AccountPanel.tsx`).

---

## 2. `/account/orders` Page

### File structure

```
src/app/(app)/account/
  orders/
    page.tsx          ← server component, fetches orders + user
    Orders.tsx        ← client container (toggle state, empty state)
    components/
      Orders-Card.tsx ← single order card (desktop + mobile responsive)
```

The existing `Account.tsx`, `Account-OrderList.tsx`, and `Account-ResellerLicense.tsx` are deleted.

### Data fetched (`page.tsx`)

```ts
prisma.order.findMany({
  where: { userId: session.user.id, stateId: { not: 0 } },  // exclude Archived
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
```

### Current vs Completed split

- **Current**: `stateId` 1–5
- **Completed**: `stateId` 6
- `stateId` 0 (Archived): excluded from query

### Toggle behavior

- Both current and completed orders exist → show "Current / Completed" toggle tabs, default to Current
- Only current orders → show "Current Orders" heading, no toggle
- Only completed orders → show "Completed Orders" heading, no toggle
- No orders at all → empty state: "No orders yet" with a link to start a quote

### Card layout

**Desktop (md+):** horizontal card, full width

```
┌──────────────────────────────────────────────────────────┐
│ [110px img] │ Nickname                  [Status Badge]   │
│             │ Order #123                                  │
│             │ 📅 Jun 28–Jun 30  👥 120 guests  3 items  $1,240 │
└──────────────────────────────────────────────────────────┘
```

**Mobile (<md):** stacked card, full width

```
┌────────────────────────┐
│ Order #123   [Status]  │  ← order # left, status badge right
│    [  80×80 photo  ]   │  ← thumbnail centered
│ Nickname               │
│ 📅 Jun 28–Jun 30       │
│ 👥 120 guests          │  ← only shown if guests > 0
│ 3 items · $1,240       │
└────────────────────────┘
```

**Thumbnail source:** `orderLineItems[0].item.primaryImageUrl ?? orderLineItems[0].tentConfig.primaryImageUrl ?? null`. If null, render a neutral placeholder background with no image element.

**Date range display:**
- Both dates same year as current year: `Jun 28–Jun 30`
- Spans into next calendar year: `Jun 28–Jan 3, 2027`
- Only `dueDate` set (no `dueDateEnd`): `Jun 28`
- Neither set: omit date row entirely

**Guests:** Only rendered when `guests` is a positive integer. Never rendered when null/undefined.

**Card tap destination:**
- `stateId` 1–2 (or no token): navigate to `/quote-builder?orderId={id}` 
- `stateId` 3–6 with token: navigate to `/orders/{token}`

**Status badge:** colored border + text using `state.color`. Matches the existing admin kanban badge style.

---

## 3. `/account/settings` Page

### File structure

```
src/app/(app)/account/
  settings/
    page.tsx              ← server component, fetches user
    Settings.tsx          ← client container
    components/
      Settings-Profile.tsx      ← editable profile fields
      Settings-Notifications.tsx ← email/SMS opt-in
```

### Data fetched (`page.tsx`)

```ts
prisma.user.findUnique({
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
```

### Profile section (`Settings-Profile.tsx`)

Editable fields:
- First name, Last name
- Email
- Phone
- Company name (optional)
- Address: street, city, state, zip (optional — shows "Add address" if none)
- Password change (existing dialog logic, moved here from the old `/account` page)

Save via `PATCH /api/users/[id]`. Address upsert: if a `addresses[0].id` exists, PATCH that address record; otherwise POST a new one via a separate addresses endpoint (to be added if not present).

All fields use `useTransition` + `Loader2` spinner on submit. Inline validation errors below each field, toast for server errors.

### Notifications section (`Settings-Notifications.tsx`)

Reuses the visual pattern from `QuotePage-ConsentToggles.tsx` (pill toggles on desktop, iOS-style row toggles on mobile) but without the "Account" option — only **Text** and **Email**.

Save via `PATCH /api/users/[id]` with `{ consentSms, consentEmail }`. Optimistic update on toggle, debounced auto-save (no explicit save button needed).

SMS disclosure shown when Text is toggled on (same copy as quote flow).

---

## 4. API Changes

### Current state (important)

The existing `PATCH /api/users/[id]` is **admin-only** and only handles `role` changes. The old `Account.tsx` password-save call was hitting this endpoint and silently failing. This needs to be fixed.

### New: `PATCH /api/users/me`

Create `src/app/api/users/me/route.ts`. Authenticated by session (user can only edit their own record). Accepts:

```ts
{
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  companyName?: string
  consentSms?: boolean
  consentEmail?: boolean
  password?: string          // if present, hashed before saving
  address?: {
    id?: string              // if present, upsert existing; otherwise create new
    street: string
    city: string
    state: string
    zipCode: string
  }
}
```

Address is upserted inline: if `address.id` is provided and belongs to this user, update it; otherwise create a new `Address` record linked to the user.

Password: only hashed and saved if `password` is non-empty and meets minimum length (8 chars) — validated server-side.

Returns `{ data: updatedUser, error: null }` or `{ data: null, error: string }`.

### `GET /api/orders` (or new `/api/orders/mine`)

The orders page is server-rendered, so no new API endpoint is needed — data is fetched directly in `page.tsx` via Prisma.

---

## 5. Redirect `/account` → `/account/orders`

```ts
// src/app/(app)/account/page.tsx  (replaces existing)
import { redirect } from "next/navigation"
export default function AccountPage() {
  redirect("/account/orders")
}
```

---

## 6. Guests Field (Schema)

Adding `guests Int?` to `Order`. This spec covers:
- Displaying `guests` on the order card (if set)
- Passing it through in the order query

The entry point for where users *enter* guest count (date picker header, quote page contact step, etc.) is **out of scope** for this spec and will be designed separately.

---

## Out of Scope

- Reseller license upload (removed, not replaced)
- Guest count entry UI (separate spec)
- Order detail changes (existing `/orders/[token]` page unchanged)
- Admin dashboard changes
