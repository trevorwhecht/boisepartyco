# Order Card: Date Display Fix, Schema Cleanup & Expandable Line Items

**Date:** 2026-06-08
**Status:** Approved

## Goal

Fix rental dates not showing on user-facing order cards, clean up the confusing triple-date schema, and let users expand an order card in-place to see a full line-item breakdown.

---

## Part 1 — Schema Cleanup

### Problem

The `Order` model has three date fields that overlap:
- `startDate DateTime?` — rental pickup, set by the quote flow
- `dueDate DateTime?` — a legacy "due date" field synced with `startDate` by the dashboard but **not** set by the quote flow
- `dueDateEnd DateTime?` — rental dropoff, used everywhere

This is why dates don't show on the account orders page: the card reads `dueDate`, which is `null` for all quote-created orders.

### Changes

**Schema:**
- Rename `dueDateEnd` → `endDate`
- Drop `dueDate`

**Migration SQL (in order):**
1. Copy `dueDate` into `startDate` for any rows where `startDate IS NULL AND dueDate IS NOT NULL` (preserves legacy data)
2. Rename column `dueDateEnd` → `endDate`
3. Drop column `dueDate`

**Code — rename all references:**
- `src/models/order.ts` — update `OrderSummary` and `OrderDetail` types
- `src/app/api/orders/route.ts` — update `dueDateEnd` → `endDate` in order creation
- `src/app/api/orders/[id]/route.ts` — update `dueDate` and `dueDateEnd` in PATCH handler
- `src/services/inventoryService.ts` — update all `dueDateEnd` Prisma filter and select references
- `src/app/api/inventory/availability/route.ts` — update any `dueDateEnd` references
- `src/app/(app)/dashboard/components/kanban/Dashboard-KanbanColumn.tsx` — sort by `startDate` instead of `dueDate`
- `src/app/(app)/dashboard/components/kanban/Dashboard-OrderCard.tsx` — display `startDate` instead of `dueDate`
- `src/app/(app)/dashboard/components/orders/Dashboard-OrderSheet.tsx` — remove dual-write (`dueDate`+`startDate`), rename `dueDateEnd` → `endDate`
- `src/app/(app)/dashboard/components/order-detail/Dashboard-OrderDetailDialog.tsx` — same as above
- `src/app/(app)/dashboard/components/views/Dashboard-CalendarView.tsx` — use `startDate` and `endDate`
- `src/app/(app)/get-quote/components/GetQuote-Form.tsx` — rename `dueDate` state → `startDate`; the form currently sends `{ dueDate }` to the PATCH endpoint, which must change to `{ startDate }`
- `src/app/(app)/orders/[token]/page.tsx` — use `startDate` instead of `dueDate`
- `src/app/(app)/account/orders/page.tsx` — update select
- `src/app/(app)/account/orders/components/Orders-Card.tsx` — use `startDate` and `endDate`
- `src/inventory.ts` — update `dropoffDate` comment if needed

---

## Part 2 — Date Display on Order Cards

After the schema cleanup, the `Orders-Card` component uses `startDate` (start) and `endDate` (end) directly — no fallback needed.

The `formatDateRange` function signature changes:
```ts
function formatDateRange(startDate: Date | null, endDate: Date | null): string | null
```

The `OrderCardData` type is updated:
```ts
startDate: Date | null   // was dueDate
endDate: Date | null     // was dueDateEnd
```

---

## Part 3 — Expandable Order Card

### Interaction

- Clicking anywhere on the card header area toggles the expanded section open/closed
- Clicking again collapses it
- Only one card can be expanded at a time (collapsing the previous one when a new one opens) — keeps the list readable
- The card is no longer a `<Link>` — it becomes a `<div>` with an `onClick` toggle

### Data

`page.tsx` fetches **all** line items per order (not just the first for the thumbnail). The expanded view needs:
- `description` — item/tent name
- `qty`
- `unitPrice`
- `lineTotal`

All line items are fetched upfront in `page.tsx`. Per-user order lists are small (typically < 10 orders, < 20 items each), so this is not a performance concern.

### Layout — Expanded Section

Below the existing card summary row, a collapsible section reveals:

```
┌─────────────────────────────────────────────────────┐
│ [thumbnail] Order Name               [Status badge]  │
│             Jun 7–9 · 45 guests · 8 items · $1,200  │
├─────────────────────────────────────────────────────┤  ← expands
│ Item Name                    2×    $150.00   $300.00 │
│ Another Item                 1×     $75.00    $75.00 │
│ Big Tent Config              1×    $800.00   $800.00 │
│ ─────────────────────────────────────────────────── │
│                            Total:          $1,175.00 │
│                         [View Order / Edit Quote →]  │
└─────────────────────────────────────────────────────┘
```

- Columns: Name · Qty · Unit price · Line total
- A divider and total row at the bottom
- A single CTA button: "Edit Quote" (if stateId ≤ 2 or no token) or "View Order" (otherwise), linking to the same href logic as before
- Expand/collapse is animated with a smooth height transition (`transition-all duration-200`)

### Components

- `Orders-Card.tsx` — expanded state managed here with `useState`. Card becomes a `<div>`, header area is the click target. Expanded section is conditionally rendered below.
- `Orders.tsx` — tracks which card id is expanded (`expandedId: number | null`), passes `isExpanded` and `onToggle` props down to each card. This ensures only one card is open at a time.

### Mobile

Same expand behavior. The stacked mobile layout shows the same line-item table below the card content, full-width.

---

## Files Changed

**New:**
- `prisma/migrations/YYYYMMDD_cleanup_order_dates/migration.sql`

**Modified:**
- `prisma/schema.prisma`
- `src/models/order.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/orders/[id]/route.ts`
- `src/services/inventoryService.ts`
- `src/app/(app)/dashboard/components/kanban/Dashboard-KanbanColumn.tsx`
- `src/app/(app)/dashboard/components/kanban/Dashboard-OrderCard.tsx`
- `src/app/(app)/dashboard/components/orders/Dashboard-OrderSheet.tsx`
- `src/app/(app)/dashboard/components/order-detail/Dashboard-OrderDetailDialog.tsx`
- `src/app/(app)/dashboard/components/views/Dashboard-CalendarView.tsx`
- `src/app/(app)/get-quote/components/GetQuote-Form.tsx`
- `src/app/(app)/orders/[token]/page.tsx`
- `src/app/(app)/account/orders/page.tsx`
- `src/app/(app)/account/orders/Orders.tsx`
- `src/app/(app)/account/orders/components/Orders-Card.tsx`
