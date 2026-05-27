# Inventory Mode Setting — Design Spec

**Date:** 2026-05-27  
**Status:** Approved  
**Project:** boisepartyco

---

## Problem

The site is going live before all inventory quantities have been entered. The admin needs a single toggle to control how the public shop handles availability, without requiring code changes.

---

## Solution Overview

Add an `inventoryMode` key to the existing `UniversalSettings` table. A new **Inventory** section in the admin Settings view exposes a three-way toggle. All public shop pages and client components read the mode and adapt their UI accordingly.

---

## The Three Modes

| Mode | Key | Behavior |
|------|-----|----------|
| Live Inventory | `"on"` | Default. Real availability from the database. |
| Contact Only | `"off"` | Products browsable but all cart/booking UI replaced with a "Contact Us" button → `/contact`. |
| Fully In Stock | `"fully_in_stock"` | Treats every item as having `available: 9999`. No availability queries run. |

---

## Architecture

### 1. Setting Storage

Stored as a row in the existing `UniversalSettings` table:
- `setting`: `"inventoryMode"`
- `value`: `"on"` | `"off"` | `"fully_in_stock"`
- Default when absent: `"on"`

No schema migration needed — the table already exists and accepts arbitrary key/value rows.

### 2. `src/lib/settings.ts` (new file)

A server-only utility module with:

```ts
export type InventoryMode = "on" | "off" | "fully_in_stock"

export async function getInventoryMode(): Promise<InventoryMode> {
  const row = await prisma.universalSettings.findUnique({ where: { setting: "inventoryMode" } })
  const v = row?.value
  if (v === "off" || v === "fully_in_stock") return v
  return "on"
}
```

Called in server components (page.tsx files and the public layout). Never called from client components — those use context.

### 3. `src/contexts/InventoryModeContext.tsx` (new file)

A thin client context:

```ts
"use client"
const InventoryModeContext = createContext<InventoryMode>("on")
export function InventoryModeProvider({ mode, children }) { ... }
export function useInventoryMode(): InventoryMode { return useContext(InventoryModeContext) }
```

### 4. `src/app/(public)/layout.tsx` (modified)

Becomes an `async` server component. Reads the mode once for the entire public subtree:

```ts
export default async function PublicLayout({ children }) {
  const mode = await getInventoryMode()
  return (
    <InventoryModeProvider mode={mode}>
      <CartProvider>
        ...
      </CartProvider>
    </InventoryModeProvider>
  )
}
```

One DB read per page load, shared by all nested components.

### 5. Server Page Components (category pages)

Each of the following `page.tsx` files calls `getInventoryMode()` independently from the layout. This is intentional — Next.js App Router layouts cannot pass server-fetched data to their page.tsx siblings, so the mode must be re-read. Two lightweight DB reads per page load is acceptable; the availability queries being skipped in non-"on" modes far outweigh the cost.

- `src/app/(public)/tents/page.tsx`
- `src/app/(public)/tents/[slug]/page.tsx`
- `src/app/(public)/tents/@modal/(.)[slug]/page.tsx`
- `src/app/(public)/tables-and-chairs/page.tsx`
- `src/app/(public)/tables-and-chairs/[slug]/page.tsx`
- `src/app/(public)/tables-and-chairs/@modal/(.)[slug]/page.tsx`
- `src/app/(public)/decor/page.tsx`
- `src/app/(public)/decor/[slug]/page.tsx`
- `src/app/(public)/decor/@modal/(.)[slug]/page.tsx`

**Branching logic** (applied to every availability computation in these pages):

```ts
const mode = await getInventoryMode()

// Availability shape for a non-tent item
const avail = mode === "off"
  ? { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }
  : mode === "fully_in_stock"
  ? { available: 9999, booked: 0, stock: 9999, isLow: false, hasConflicts: false }
  : await getItemAvailability(item.id, from!, to!)  // "on" — real query

// Config avail shape (adds bomComplete / bottleneckParts)
const configAvail = mode === "off"
  ? { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: config.bomComplete, bottleneckParts: [] }
  : mode === "fully_in_stock"
  ? { available: 9999, booked: 0, stock: 9999, isLow: false, hasConflicts: false, bomComplete: true, bottleneckParts: [] }
  : await getTentConfigAvailability(config.id, from!, to!)
```

This skips all availability DB queries in `"off"` and `"fully_in_stock"` modes — a meaningful performance win on pages with many items.

### 6. `/api/inventory/availability` Route (modified)

The `QuotePage` client fetches this endpoint for cart availability. The route checks the mode:

- `"off"`: return `{ data: { items: {}, configs: {}, mode: "off" }, error: null }` — empty maps, plus a `mode` field so the client knows why
- `"fully_in_stock"`: for each requested itemId/configId, return `{ available: 9999, stock: 9999, booked: 0, isLow: false }`
- `"on"`: current behavior, unchanged

### 7. Client Component Changes

All use `useInventoryMode()` — no prop changes needed.

#### `ItemCard-Grid.tsx` and `ItemCard-List.tsx`

When mode is `"off"`:
- Replace the "Add" button and any `QtyStepper` (when item is in cart) with a **"Contact Us"** `<Link href="/contact">` button styled consistently with the existing Add button
- Hide `AvailabilityBadge`

When mode is `"fully_in_stock"` or `"on"`: no change.

#### `TentConfigCard.tsx`

When mode is `"off"`:
- The card remains a link to the detail page
- No structural change to the card itself; the booking section inside the modal handles the "off" state (see below)

When mode is `"fully_in_stock"` or `"on"`: no change.

#### `ShopItemModal-ItemBooking.tsx` and `ShopItemModal-TentConfigBooking.tsx`

When mode is `"off"`:
- Replace the entire booking/date/qty/subtotal section with a centered "Contact Us" CTA block:
  - Brief copy: "To check availability and reserve this item, get in touch."
  - A `<Link href="/contact">` button: "Contact Us"

When mode is `"fully_in_stock"` or `"on"`: no change.

#### `CategoryListing.tsx`

When mode is `"off"`:
- Hide the "Hide fully-booked" checkbox filter (irrelevant since availability isn't shown)

#### `QuotePage.tsx`

When mode is `"off"`:
- Render a full-page "Contact us to book" state instead of the cart/checkout flow:
  - Heading: "Ready to book?"
  - Body: "Reach out directly and we'll walk you through availability and pricing."
  - CTA button: "Contact Us" → `/contact`
- Do not fetch `/api/inventory/availability`

When mode is `"fully_in_stock"` or `"on"`: no change.

### 8. Admin Settings UI

A new **"Inventory"** section in `Dashboard-SettingsView.tsx`, positioned above Employee Permissions.

Three-option toggle using the existing `Select` pattern (consistent with the permissions dropdowns already in the settings view):

| Display Label | Value | Description |
|---|---|---|
| Live Inventory | `on` | Shows real availability from your database |
| Contact Only | `off` | Products browsable; all booking replaced with a Contact Us prompt |
| Fully In Stock | `fully_in_stock` | Treats everything as available — use before inventory is fully entered |

Saves on change via `PATCH /api/settings` with `{ setting: "inventoryMode", value }`. Optimistic update with rollback on error (same pattern as employee permissions).

---

## Data Flow Diagram

```
Admin sets mode in Settings UI
  → PATCH /api/settings { setting: "inventoryMode", value: "..." }
  → UniversalSettings row upserted

Public page load (server):
  → getInventoryMode() reads UniversalSettings
  → Layout wraps with <InventoryModeProvider mode={mode}>
  → Page skips availability queries if mode ≠ "on"

Client components:
  → useInventoryMode() reads context
  → Conditionally render "Contact Us" or normal cart UI

QuotePage (client):
  → useInventoryMode() → "off"? Show contact state, skip fetch
  → "on" or "fully_in_stock"? Fetch /api/inventory/availability
    → Route checks mode → returns real or 9999 data
```

---

## Files Affected

### New
- `src/lib/settings.ts` — `getInventoryMode()` utility
- `src/contexts/InventoryModeContext.tsx` — `InventoryModeProvider` + `useInventoryMode()`

### Modified
- `src/app/(public)/layout.tsx`
- `src/app/(public)/tents/page.tsx`
- `src/app/(public)/tents/[slug]/page.tsx`
- `src/app/(public)/tents/@modal/(.)[slug]/page.tsx`
- `src/app/(public)/tables-and-chairs/page.tsx`
- `src/app/(public)/tables-and-chairs/[slug]/page.tsx`
- `src/app/(public)/tables-and-chairs/@modal/(.)[slug]/page.tsx`
- `src/app/(public)/decor/page.tsx`
- `src/app/(public)/decor/[slug]/page.tsx`
- `src/app/(public)/decor/@modal/(.)[slug]/page.tsx`
- `src/app/api/inventory/availability/route.ts`
- `src/components/shared/ItemCard-Grid.tsx`
- `src/components/shared/ItemCard-List.tsx`
- `src/components/shared/TentConfigCard.tsx`
- `src/components/shared/CategoryListing.tsx`
- `src/components/shared/modals/ShopItemModal-ItemBooking.tsx`
- `src/components/shared/modals/ShopItemModal-TentConfigBooking.tsx`
- `src/app/(public)/quote/QuotePage.tsx`
- `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx`

---

## Out of Scope

- No Prisma schema changes
- No migration required
- The `quote/page.tsx` server wrapper does not need changing (QuotePage handles the "off" state client-side via context)
- The `ShopHeader` cart icon is not hidden in "off" mode — the cart will naturally be empty since items can't be added
- The `/api/settings` PATCH endpoint already exists and handles this without modification
