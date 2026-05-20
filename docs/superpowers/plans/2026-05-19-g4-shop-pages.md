# G4: Shop Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every public shop page — home, category listings, item/tent-config detail, quote/cart, gallery, FAQ, contact — replacing the placeholder pages created in G3.

**Architecture:** Server components fetch data (including date-range-scoped availability) and pass it down to thin client components for interactivity. Date range lives in URL search params (`?from=YYYY-MM-DD&to=YYYY-MM-DD`). Cart lives in CartContext (localStorage). Quote submission calls `POST /api/orders` with the `CreateOrderPayload` shape from G2.

**Tech Stack:** Next.js App Router server + client components · Prisma (direct service calls, never fetch() to own API from server) · lucide-react · existing CartContext/DateRangeField/AvailabilityBadge/QtyStepper from G3

**Prerequisite:** G1, G2, and G3 complete; `npm run dev` runs; `src/models/inventory.ts` and `src/services/inventoryService.ts` exist.

---

## File Map

**Modify:**
- `src/models/inventory.ts` — add `name: string` to `CartLine`
- `src/contexts/CartContext.tsx` — update `addToCart` to accept `name` parameter
- `src/services/inventoryService.ts` — add `getItemDailyAvailability`

**Replace placeholders:**
- `src/app/(public)/page.tsx` — home page (server)
- `src/app/(public)/tents/page.tsx` — tents page (server)
- `src/app/(public)/tables-and-chairs/page.tsx` — tables & chairs (server)
- `src/app/(public)/decor/page.tsx` — decor (server)
- `src/app/(public)/shop/[slug]/page.tsx` — item or config detail (server)
- `src/app/(public)/quote/page.tsx` — thin server wrapper
- `src/app/(public)/gallery/page.tsx` — static gallery (server)
- `src/app/(public)/faq/page.tsx` — static FAQ (server)
- `src/app/(public)/contact/page.tsx` — contact form (client — has onSubmit handler)

**Create:**
- `src/app/(public)/Home-Hero.tsx` — client: DateRangeField + CTA (hero section)
- `src/app/(public)/tents/TentsListing.tsx` — client: tent config cards + item list
- `src/components/shared/CategoryListing.tsx` — client: shared grid/list for non-tent categories
- `src/components/shared/ItemCard-Grid.tsx` — grid item card
- `src/components/shared/ItemCard-List.tsx` — list item row
- `src/components/shared/TentConfigCard.tsx` — tent config card (links to detail)
- `src/app/(public)/shop/[slug]/ItemDetail.tsx` — client: booking card, qty, add-to-cart
- `src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx` — client: 35-day availability strip
- `src/app/(public)/shop/[slug]/TentConfigDetail.tsx` — client: tent config booking card
- `src/app/(public)/quote/QuotePage.tsx` — client: 3-step quote flow

---

## Task 1: Add `name` to CartLine and update CartContext

**Files:**
- Modify: `src/models/inventory.ts`
- Modify: `src/contexts/CartContext.tsx`

- [ ] **Step 1: Add `name` to CartLine in inventory.ts**

Open `src/models/inventory.ts`. Find the `CartLine` type and add `name: string`:

```typescript
export type CartLine = {
  kind: CartLineKind
  refId: number
  qty: number
  name: string          // display name — captured at add-time to avoid extra fetches
  unitPrice: number
  notes?: string | null
}
```

- [ ] **Step 2: Update CartContext addToCart signature**

Open `src/contexts/CartContext.tsx`. Update `addToCart` to accept `name`:

```typescript
// In the CartContextType interface:
addToCart: (refId: number, kind: CartLineKind, qty: number, name: string, unitPrice: number) => void

// In the provider implementation:
const addToCart = (refId: number, kind: CartLineKind, qty: number, name: string, unitPrice: number) => {
  setLines(prev => {
    const existing = prev.find(l => l.refId === refId && l.kind === kind)
    if (existing) {
      return prev.map(l =>
        l.refId === refId && l.kind === kind ? { ...l, qty: l.qty + qty } : l
      )
    }
    return [...prev, { kind, refId, qty, name, unitPrice }]
  })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to CartLine or addToCart.

---

## Task 2: Add `getItemDailyAvailability` to inventoryService

**Files:**
- Modify: `src/services/inventoryService.ts`

This function pre-computes 35-day availability for the detail page strip in a **single** DB query (one `orderLineItem.findMany` for the whole range, then per-day filtering in memory — avoids 35 separate query round-trips).

- [ ] **Step 1: Append the function to inventoryService.ts**

```typescript
// Append to src/services/inventoryService.ts

/**
 * Returns per-day availability for an item for `days` days starting at `startDate`.
 * Uses a single DB query for the whole range, then filters per-day in memory.
 */
export async function getItemDailyAvailability(
  itemId: number,
  startDate: Date,
  days: number = 35,
): Promise<{ date: string; available: number; total: number }[]> {
  const rangeEnd = new Date(startDate)
  rangeEnd.setDate(rangeEnd.getDate() + days)

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { qty: true, category: { select: { isSerialized: true } } },
  })
  if (!item) return []

  const stock = item.category.isSerialized
    ? await prisma.serializedUnit.count({ where: { itemId, status: "available" } })
    : (item.qty ?? 0)

  const lines = await prisma.orderLineItem.findMany({
    where: {
      itemId,
      order: {
        startDate: { lt: rangeEnd },
        dueDateEnd: { gt: startDate },
        state: { consumesInventory: true },
      },
    },
    select: {
      qty: true,
      order: { select: { startDate: true, dueDateEnd: true } },
    },
  })

  const result: { date: string; available: number; total: number }[] = []
  for (let i = 0; i < days; i++) {
    const day = new Date(startDate)
    day.setDate(day.getDate() + i)
    day.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const booked = lines
      .filter(l => l.order.startDate !== null && l.order.dueDateEnd !== null
        && l.order.startDate <= dayEnd && l.order.dueDateEnd >= day)
      .reduce((sum, l) => sum + l.qty, 0)

    result.push({
      date: day.toISOString().slice(0, 10),
      available: Math.max(0, stock - booked),
      total: stock,
    })
  }
  return result
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 3: Shared item card components

**Files:**
- Create: `src/components/shared/ItemCard-Grid.tsx`
- Create: `src/components/shared/ItemCard-List.tsx`

These are pure display components — no cart logic, just callbacks. Both are client components because they render QtyStepper (interactive).

- [ ] **Step 1: Create ItemCard-Grid.tsx**

```tsx
"use client"
import Link from "next/link"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import QtyStepper from "@/components/shared/QtyStepper"
import type { ItemSummary, AvailabilityResult, CartLine } from "@/models/inventory"

type Props = {
  item: ItemSummary
  avail: AvailabilityResult
  hasRange: boolean
  cartLine: CartLine | null
  onAdd: (refId: number, qty: number, name: string, unitPrice: number) => void
  onUpdate: (refId: number, qty: number) => void
}

export default function ItemCardGrid({ item, avail, hasRange, cartLine, onAdd, onUpdate }: Props) {
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.stock ?? 99)

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      <Link href={`/shop/${item.slug}`} className="block">
        <div className="aspect-[4/3] bg-(--shop-paper) flex items-center justify-center text-(--shop-ink-soft) text-sm">
          {item.name}
        </div>
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="serif text-2xl font-medium leading-tight">
            <Link href={`/shop/${item.slug}`} className="text-(--shop-ink) hover:text-(--shop-blue)">
              {item.name}
            </Link>
          </h3>
          <span className="mono text-sm whitespace-nowrap">
            {Number(item.flatPrice) > 0
              ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><span className="text-(--shop-ink-soft)">/day</span></>
              : <strong className="text-(--shop-blue)">Call</strong>}
          </span>
        </div>
        {item.subcategory ? (
          <div className="text-xs text-(--shop-ink-soft) mt-1">{item.subcategory}</div>
        ) : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-3 mb-4 leading-relaxed flex-1">{item.blurb}</p>
        ) : <div className="flex-1" />}
        <div className="flex justify-between items-center gap-3 mt-2">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          {cartLine ? (
            <QtyStepper
              compact
              value={cartLine.qty}
              min={1}
              max={maxQty}
              onChange={(q) => onUpdate(item.id, q)}
            />
          ) : (
            <button
              disabled={disabled}
              onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ItemCard-List.tsx**

```tsx
"use client"
import Link from "next/link"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import QtyStepper from "@/components/shared/QtyStepper"
import type { ItemSummary, AvailabilityResult, CartLine } from "@/models/inventory"

type Props = {
  item: ItemSummary
  avail: AvailabilityResult
  hasRange: boolean
  cartLine: CartLine | null
  onAdd: (refId: number, qty: number, name: string, unitPrice: number) => void
  onUpdate: (refId: number, qty: number) => void
}

export default function ItemCardList({ item, avail, hasRange, cartLine, onAdd, onUpdate }: Props) {
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.stock ?? 99)

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-4 grid gap-5 items-center"
      style={{ gridTemplateColumns: "96px 1fr auto auto auto" }}>
      <Link href={`/shop/${item.slug}`}>
        <div className="aspect-[4/3] bg-(--shop-paper) rounded-lg" />
      </Link>
      <div>
        <h3 className="serif text-xl font-medium">
          <Link href={`/shop/${item.slug}`} className="text-(--shop-ink) hover:text-(--shop-blue)">
            {item.name}
          </Link>
        </h3>
        {item.subcategory ? <div className="text-xs text-(--shop-ink-soft) mt-0.5">{item.subcategory}</div> : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-1.5 leading-snug max-w-lg">{item.blurb}</p>
        ) : null}
      </div>
      <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
      <div className="mono text-sm text-right">
        {Number(item.flatPrice) > 0
          ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><div className="text-(--shop-ink-soft) text-xs">per day</div></>
          : <strong className="text-(--shop-blue)">Call</strong>}
      </div>
      {cartLine ? (
        <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
      ) : (
        <button
          disabled={disabled}
          onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add to quote
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 4: TentConfigCard

**Files:**
- Create: `src/components/shared/TentConfigCard.tsx`

Tent config cards link to `/shop/[config.slug]` — no add-to-cart on the listing (users select quantity on the detail page).

- [ ] **Step 1: Create TentConfigCard.tsx**

```tsx
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { TentConfigurationSummary, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

export default function TentConfigCard({ config, avail, hasRange }: Props) {
  return (
    <Link href={`/shop/${config.slug}`} className="block bg-white border border-(--shop-line) rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-150">
      <div className="aspect-[4/3] bg-(--shop-paper) flex items-center justify-center text-(--shop-ink-soft) text-sm">
        {config.name}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <h3 className="serif text-2xl font-medium text-(--shop-ink)">{config.name}</h3>
          <span className="mono text-sm">
            {Number(config.flatPrice) > 0
              ? <><strong>${Number(config.flatPrice).toFixed(0)}</strong><span className="text-(--shop-ink-soft)">/day</span></>
              : <strong className="text-(--shop-blue)">Call</strong>}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-(--shop-ink-soft) mb-3">
          {config.widthFt ? <span>{config.widthFt}×{config.lengthFt} ft</span> : null}
          {config.capacity ? <><span>·</span><span>Up to {config.capacity}</span></> : null}
        </div>
        {config.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4">{config.blurb}</p>
        ) : null}
        <div className="flex items-center justify-between">
          <AvailabilityBadge available={avail.available} stock={avail.available + avail.booked} hasRange={hasRange} />
          {!avail.bomComplete ? (
            <span className="inline-flex items-center gap-1 text-xs text-(--shop-warn)">
              <AlertTriangle size={12} /> Contact for pricing
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 5: CategoryListing shared client component

**Files:**
- Create: `src/components/shared/CategoryListing.tsx`

Used by the tables-and-chairs and decor pages. Handles view toggle, hide-unavailable filter, subcategory grouping, and cart interactions.

- [ ] **Step 1: Create CategoryListing.tsx**

```tsx
"use client"
import { useState } from "react"
import { Grid, List } from "lucide-react"
import ItemCardGrid from "@/components/shared/ItemCard-Grid"
import ItemCardList from "@/components/shared/ItemCard-List"
import { useCart } from "@/contexts/CartContext"
import type { ItemSummary, AvailabilityResult } from "@/models/inventory"

export type ItemWithAvail = {
  item: ItemSummary
  avail: AvailabilityResult
}

type Props = {
  items: ItemWithAvail[]
  hasRange: boolean
  dateLabel?: string
}

export default function CategoryListing({ items, hasRange, dateLabel }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const { lines, addToCart, updateLine } = useCart()

  const visible = hideUnavailable && hasRange
    ? items.filter(x => x.avail.available > 0)
    : items

  // Group by subcategory preserving first-appearance order
  const groups: { name: string; items: ItemWithAvail[] }[] = []
  const seen = new Map<string, number>()
  visible.forEach(x => {
    const key = x.item.subcategory ?? "Other"
    if (!seen.has(key)) { seen.set(key, groups.length); groups.push({ name: key, items: [] }) }
    groups[seen.get(key)!].items.push(x)
  })

  return (
    <>
      {/* Filter strip */}
      <div className="bg-white border-b border-(--shop-line) py-4 sticky top-[137px] z-30">
        <div className="max-w-[1320px] mx-auto px-8 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <span className="text-sm text-(--shop-ink-soft)">
              <strong className="text-(--shop-ink)">{visible.length}</strong> items
              {dateLabel ? <> · for {dateLabel}</> : null}
            </span>
            {hasRange ? (
              <label className="inline-flex gap-2 items-center text-sm text-(--shop-ink-soft) cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideUnavailable}
                  onChange={e => setHideUnavailable(e.target.checked)}
                />
                Hide fully-booked
              </label>
            ) : null}
          </div>
          <div className="flex gap-1.5 p-0.5 bg-(--shop-paper) rounded-lg">
            {(["grid", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex gap-1.5 items-center transition-colors ${
                  view === v ? "bg-white text-(--shop-ink) shadow-sm" : "text-(--shop-ink-soft)"
                }`}>
                {v === "grid" ? <Grid size={13} /> : <List size={13} />}
                {v === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="max-w-[1320px] mx-auto px-8 py-10 pb-20">
        {groups.map((g, gi) => (
          <div key={g.name} className={gi < groups.length - 1 ? "mb-14" : ""}>
            {groups.length > 1 ? (
              <div className="flex justify-between items-baseline mb-6 pb-3 border-b border-(--shop-line)">
                <h2 className="serif text-3xl font-medium">{g.name}</h2>
                <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">
                  {g.items.length} {g.items.length === 1 ? "item" : "items"}
                </span>
              </div>
            ) : null}
            {view === "grid" ? (
              <div className="grid gap-7" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {g.items.map(({ item, avail }) => (
                  <ItemCardGrid
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice) => addToCart(refId, "item", qty, name, unitPrice)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {g.items.map(({ item, avail }) => (
                  <ItemCardList
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice) => addToCart(refId, "item", qty, name, unitPrice)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="text-center py-20 text-(--shop-ink-soft)">
            No items available for these dates. Try different dates or{" "}
            <button onClick={() => setHideUnavailable(false)} className="text-(--shop-blue) underline">
              show all items
            </button>.
          </div>
        ) : null}
      </div>
    </>
  )
}
```

**Note:** `useCart` needs to expose `updateLine(refId, kind, qty)`. Check that signature matches what G3 implemented. If G3's `updateLine` is `(itemId, qty)`, update the signature in CartContext to `(refId: number, kind: CartLineKind, qty: number)`. Do that now if needed before proceeding.

- [ ] **Step 2: Verify CartContext updateLine signature**

Open `src/contexts/CartContext.tsx`. Check `updateLine`. It should be:

```typescript
const updateLine = (refId: number, kind: CartLineKind, qty: number) => {
  setLines(prev =>
    qty <= 0
      ? prev.filter(l => !(l.refId === refId && l.kind === kind))
      : prev.map(l => l.refId === refId && l.kind === kind ? { ...l, qty } : l)
  )
}
```

If the signature differs, update it now and fix the type in `CartContextType`.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 6: Home page

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Create: `src/app/(public)/Home-Hero.tsx`

Server component reads date params and fetches: (a) category item counts, (b) 4 featured items + their availability for the date range. Home-Hero.tsx is the one client island (DateRangeField + CTA).

- [ ] **Step 1: Create Home-Hero.tsx**

```tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import DateRangeField from "@/components/shared/DateRangeField"

export default function HomeHero() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null

  const handleChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`/?${next.toString()}`)
  }

  return (
    <section className="relative overflow-hidden" style={{ height: 640 }}>
      {/* Tent-interior placeholder backdrop */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, rgba(20,30,50,0.10) 0%, rgba(20,30,50,0.55) 70%, rgba(20,30,50,0.75) 100%), radial-gradient(ellipse at 50% 30%, #d8e3ec 0%, #b4c5d2 35%, #768899 70%, #3d4d5d 100%)",
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1600 640" preserveAspectRatio="none"
          className="absolute inset-0 opacity-30">
          {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
            <line key={i} x1={i*160} y1="0" x2="800" y2="180" stroke="#fff" strokeWidth="1.2"/>
          ))}
          {[...Array(14)].map((_,i) => (
            <g key={i}>
              <line x1={120 + i*100} y1="180" x2={120 + i*100} y2={210 + (i%3)*40} stroke="#fff" strokeWidth="0.8" opacity="0.5"/>
              <circle cx={120 + i*100} cy={210 + (i%3)*40} r="3" fill="#ffe9a8" opacity="0.95"/>
            </g>
          ))}
        </svg>
      </div>

      <div className="relative max-w-[1320px] mx-auto px-8 pt-32 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">
          Boise · Meridian · Eagle · Nampa
        </p>
        <h1 className="serif font-medium leading-[1.02] tracking-tight max-w-[880px]"
          style={{ fontSize: 76, textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          Rentals for <em className="italic">every occasion</em><br />in the Treasure Valley.
        </h1>
        <p className="mt-5 text-lg text-white/90 max-w-lg leading-relaxed">
          Tents, tables, dance floors, and the small details. Check live availability for your weekend and reserve in minutes.
        </p>
        <div className="mt-10 inline-flex items-center gap-3.5 p-2.5 bg-white/95 rounded-full"
          style={{ boxShadow: "0 14px 40px -10px rgba(0,0,0,0.45)" }}>
          <DateRangeField start={start} end={end} onChange={handleChange} />
          <a href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
            style={{ background: "var(--shop-blue)" }}>
            See what's available <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Rewrite src/app/(public)/page.tsx**

```tsx
import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Truck, Shield, Calendar, Star } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import HomeHero from "./Home-Hero"

export const dynamic = "force-dynamic"

const FEATURED_SLUGS = ["20x40-frame-tent", "8ft-farmhouse-table", "crossback-chair", "12x12-dance-floor"]

const CATEGORIES = [
  { slug: "tents", href: "/tents", label: "Tents", blurb: "Frame, pole, and high-peak structures from 20×20 to 40×80." },
  { slug: "tables-and-chairs", href: "/tables-and-chairs", label: "Tables & Chairs", blurb: "Crossbacks, chiavari, farmhouse, banquet rounds, rectangulars." },
  { slug: "decor", href: "/decor", label: "Decor & Dance Floor", blurb: "Dance floors, bistro lighting, arches, linens, heaters." },
]

const HOW_IT_WORKS = [
  { n: "01", title: "Pick your dates", body: "Use the calendar at the top of any page. Availability updates instantly." },
  { n: "02", title: "Build your list", body: "Add tents, tables, and the little things. Quantities flag if anything's tight." },
  { n: "03", title: "Lock it in", body: "Send your quote. We confirm within 4 business hours and hold your items." },
  { n: "04", title: "We do the rest", body: "Day-before delivery, day-after pickup, level floor in between." },
]

const WHY_US = [
  { icon: Truck, title: "White-glove delivery", blurb: "Setup and teardown included in every quote. We handle the heavy lifting." },
  { icon: Shield, title: "Backed by a guarantee", blurb: "Every tent goes up the day before and is inspected by an owner." },
  { icon: Calendar, title: "Real-time availability", blurb: "No phone tag. See what's free for your weekend and lock it in." },
  { icon: Star, title: "Locally rated #1", blurb: "Boise Weekly Best of 2023 & 2024 · The Knot Best of Weddings." },
]

export default async function HomePage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const from = searchParams.from ? new Date(searchParams.from) : null
  const to = searchParams.to ? new Date(searchParams.to) : null

  // Category item counts
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, _count: { select: { items: true } } },
  })
  const countBySlug = Object.fromEntries(cats.map(c => [c.slug, c._count.items]))

  // Featured items — try slugs, fall back to first 4 items
  const featured = await prisma.item.findMany({
    where: { slug: { in: FEATURED_SLUGS }, isActive: true },
    select: { id: true, slug: true, name: true, blurb: true, flatPrice: true, qty: true },
    take: 4,
  })

  // Availability for featured items (only if dates provided)
  const featuredWithAvail = await Promise.all(featured.map(async item => {
    if (!from || !to) return { item, available: null }
    const avail = await getItemAvailability(item.id, from, to)
    return { item, available: avail.available }
  }))

  return (
    <main>
      <Suspense fallback={<div style={{ height: 640, background: "#3d4d5d" }} />}>
        <HomeHero />
      </Suspense>

      {/* Categories */}
      <section className="py-20" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <div className="flex justify-between items-end mb-10 flex-wrap gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-3">Shop by category</p>
              <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: 48 }}>
                Build your event from the ground up.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-(--shop-ink-soft) leading-relaxed">
              Pick a category and your dates. We'll show you exactly what's free — no calls, no waiting on a reply.
            </p>
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {CATEGORIES.map(c => (
              <Link key={c.slug} href={c.href}
                className="block bg-white rounded-xl overflow-hidden border border-(--shop-line) hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <div className="aspect-[5/3] bg-(--shop-paper)" />
                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <h3 className="serif text-2xl font-medium">{c.label}</h3>
                    {countBySlug[c.slug] ? (
                      <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">
                        {countBySlug[c.slug]} items
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4">{c.blurb}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)">
                    Browse {c.label.toLowerCase()} <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-24">
        <div className="max-w-[1320px] mx-auto px-8 grid gap-20 items-center" style={{ gridTemplateColumns: "1fr 1.1fr" }}>
          <div className="aspect-[4/5] bg-(--shop-paper) rounded-xl relative">
            <div className="absolute -bottom-7 -right-7 w-44 rounded-xl p-5 text-white"
              style={{ background: "var(--shop-blue)" }}>
              <div className="serif font-semibold leading-none" style={{ fontSize: 38 }}>
                4.9<span className="text-2xl opacity-70">/5</span>
              </div>
              <div className="text-xs opacity-90 mt-1">342 reviews · The Knot &amp; Google</div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-4">Why neighbors book us</p>
            <h2 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 54 }}>
              Our party rental services will take your event to the next level.
            </h2>
            <p className="mt-5 text-base text-(--shop-ink-soft) leading-relaxed max-w-xl">
              Family-owned and based in Garden City since 2014. We deliver, set up, level the floor, hang the lights — and come back at the end of the night so you don't have to.
            </p>
            <div className="mt-9 grid gap-7" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {WHY_US.map(f => (
                <div key={f.title} className="flex gap-3.5">
                  <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-(--shop-blue)"
                    style={{ background: "var(--shop-blue-soft)" }}>
                    <f.icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                    <p className="mt-1 text-[13px] text-(--shop-ink-soft) leading-snug">{f.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured items */}
      {featuredWithAvail.length > 0 ? (
        <section className="py-10 pb-24 bg-white">
          <div className="max-w-[1320px] mx-auto px-8">
            <div className="flex justify-between items-baseline mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-2">This weekend</p>
                <h2 className="serif font-medium tracking-tight" style={{ fontSize: 44 }}>
                  Most-booked right now
                </h2>
              </div>
              <Link href="/tents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)">
                View all inventory <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {featuredWithAvail.map(({ item, available }) => (
                <Link key={item.id} href={`/shop/${item.slug}`} className="block text-(--shop-ink)">
                  <div className="aspect-square bg-(--shop-paper) rounded-xl mb-3.5" />
                  <div className="flex justify-between items-baseline gap-3">
                    <h4 className="serif text-xl font-medium">{item.name}</h4>
                    <span className="mono text-xs whitespace-nowrap">
                      ${Number(item.flatPrice).toFixed(0)}<span className="text-(--shop-ink-soft)">/day</span>
                    </span>
                  </div>
                  {item.blurb ? (
                    <p className="text-[13px] text-(--shop-ink-soft) mt-1.5 leading-snug">{item.blurb}</p>
                  ) : null}
                  {available !== null ? (
                    <div className="mt-3">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                        available <= 0 ? "bg-[#fbeae6] text-(--shop-warn)" : "bg-[#e7f4ec] text-(--shop-ok)"
                      }`}>
                        {available <= 0 ? "Fully booked" : `${available} available`}
                      </span>
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="py-20" style={{ background: "var(--shop-blue-deep)", color: "#fff" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">How it works</p>
          <h2 className="serif font-medium leading-tight tracking-tight max-w-2xl" style={{ fontSize: 44 }}>
            From "we should rent a tent" to lights-on in four steps.
          </h2>
          <div className="grid gap-8 mt-12" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {HOW_IT_WORKS.map(s => (
              <div key={s.n}>
                <div className="serif font-light italic opacity-50 mb-1.5" style={{ fontSize: 48 }}>{s.n}</div>
                <h4 className="text-lg font-semibold mb-2">{s.title}</h4>
                <p className="text-sm leading-relaxed text-white/78">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[900px] mx-auto px-8 text-center">
          <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: 56 }}>
            Picture it under the lights.<br />Let's make a list.
          </h2>
          <p className="mt-5 text-lg text-(--shop-ink-soft) max-w-xl mx-auto leading-relaxed">
            Tell us your dates and we'll show you everything available — no commitment, no haggling.
          </p>
          <div className="mt-9 inline-flex gap-3">
            <Link href="/tents"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}>
              Browse inventory <ArrowRight size={14} />
            </Link>
            <Link href="/contact"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold border border-(--shop-line) text-(--shop-ink) bg-white">
              Talk to a human
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Start dev server and verify home page renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: hero section visible, categories, why-us, featured items, how-it-works, CTA — no JS errors in console.

---

## Task 7: Tents page

**Files:**
- Modify: `src/app/(public)/tents/page.tsx`
- Create: `src/app/(public)/tents/TentsListing.tsx`

The tents page shows TentConfigurations (the packaged deals) first, then individual tent accessory items below.

- [ ] **Step 1: Create TentsListing.tsx**

```tsx
"use client"
import TentConfigCard from "@/components/shared/TentConfigCard"
import CategoryListing from "@/components/shared/CategoryListing"
import type { ItemWithAvail } from "@/components/shared/CategoryListing"
import type { TentConfigurationSummary, ConfigAvailabilityResult, ItemSummary, AvailabilityResult } from "@/models/inventory"

// Re-export for server page import
export type { ItemWithAvail }

type ConfigWithAvail = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
}

type Props = {
  configs: ConfigWithAvail[]
  items: { item: ItemSummary; avail: AvailabilityResult }[]
  hasRange: boolean
  dateLabel?: string
}

export default function TentsListing({ configs, items, hasRange, dateLabel }: Props) {
  return (
    <>
      {/* Tent configurations */}
      {configs.length > 0 ? (
        <section className="max-w-[1320px] mx-auto px-8 pt-12 pb-6">
          <div className="flex justify-between items-baseline mb-6 pb-3 border-b border-(--shop-line)">
            <h2 className="serif text-3xl font-medium">Tent Packages</h2>
            <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">{configs.length} configs</span>
          </div>
          <div className="grid gap-7" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {configs.map(({ config, avail }) => (
              <TentConfigCard key={config.id} config={config} avail={avail} hasRange={hasRange} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Individual tent items (accessories etc.) */}
      {items.length > 0 ? (
        <section className="mt-8">
          {configs.length > 0 ? (
            <div className="max-w-[1320px] mx-auto px-8 mb-2">
              <div className="flex justify-between items-baseline pb-3 border-b border-(--shop-line)">
                <h2 className="serif text-3xl font-medium">Tent Accessories</h2>
              </div>
            </div>
          ) : null}
          <CategoryListing items={items} hasRange={hasRange} dateLabel={dateLabel} />
        </section>
      ) : null}

      {configs.length === 0 && items.length === 0 ? (
        <div className="max-w-[1320px] mx-auto px-8 py-24 text-center text-(--shop-ink-soft)">
          No tent inventory found. Check back soon.
        </div>
      ) : null}
    </>
  )
}
```

- [ ] **Step 2: Rewrite tents/page.tsx**

```tsx
import { Suspense } from "react"
import DateRangeField from "@/components/shared/DateRangeField"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getTentConfigAvailability } from "@/services/inventoryService"
import TentsListing from "./TentsListing"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function TentsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const from = searchParams.from ? new Date(searchParams.from) : null
  const to = searchParams.to ? new Date(searchParams.to) : null
  const hasRange = !!(from && to)
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined

  const [configs, items] = await Promise.all([
    prisma.tentConfiguration.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        widthFt: true, lengthFt: true, capacity: true, bomComplete: true,
      },
    }),
    prisma.item.findMany({
      where: { category: { slug: "tents" }, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        qty: true, subcategory: true, size: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ])

  const configsWithAvail = await Promise.all(configs.map(async c => ({
    config: c,
    avail: hasRange
      ? await getTentConfigAvailability(c.id, from!, to!)
      : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: c.bomComplete, bottleneckParts: [] },
  })))

  const itemsWithAvail = await Promise.all(items.map(async item => ({
    item: { ...item, stock: item.qty ?? 0 },
    avail: hasRange
      ? await getItemAvailability(item.id, from!, to!)
      : { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false },
  })))

  return (
    <main>
      {/* Page header */}
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="text-(--shop-ink-soft) hover:text-(--shop-ink)">Home</a>
            {" "}/{" "}
            <span className="text-(--shop-ink)">Tents</span>
          </p>
          <div className="flex justify-between items-end gap-8 flex-wrap">
            <div>
              <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Tents</h1>
              <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
                From backyard 20×20s up to our 40×80 high-peak — every tent includes setup, stakedown, and inspection by an owner.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 items-end">
              <div className="text-xs text-(--shop-ink-soft)">Showing availability for</div>
              <Suspense fallback={null}>
                <DateRangeField
                  start={from}
                  end={to}
                  onChange={() => {}}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <TentsListing
          configs={configsWithAvail}
          items={itemsWithAvail}
          hasRange={hasRange}
          dateLabel={dateLabel}
        />
      </Suspense>
    </main>
  )
}
```

**Note:** The `DateRangeField` in the page header is read-only for display purposes here — the ShopHeader's DateRangeField drives URL updates. If you want the header DateRangeField to also update URLs, wrap it in a small client component that calls `router.replace`. For now, treat it as display-only or omit it from the page header.

- [ ] **Step 3: Open http://localhost:3000/tents and verify**

Expected: page header with "Tents" h1, tent config cards in a 3-column grid, no JS errors.

---

## Task 8: Tables & Chairs and Decor pages

**Files:**
- Modify: `src/app/(public)/tables-and-chairs/page.tsx`
- Modify: `src/app/(public)/decor/page.tsx`

Both pages are identical in structure — only the category slug and copy differ.

- [ ] **Step 1: Rewrite tables-and-chairs/page.tsx**

```tsx
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import CategoryListing from "@/components/shared/CategoryListing"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function TablesChairsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const from = searchParams.from ? new Date(searchParams.from) : null
  const to = searchParams.to ? new Date(searchParams.to) : null
  const hasRange = !!(from && to)
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined

  const items = await prisma.item.findMany({
    where: { category: { slug: "tables-and-chairs" }, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, subcategory: true, size: true,
      category: { select: { slug: true, name: true } },
    },
  })

  const itemsWithAvail = await Promise.all(items.map(async item => ({
    item: { ...item, stock: item.qty ?? 0 },
    avail: hasRange
      ? await getItemAvailability(item.id, from!, to!)
      : { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false },
  })))

  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="text-(--shop-ink-soft) hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Tables &amp; Chairs</span>
          </p>
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Tables &amp; Chairs</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            Crossbacks to chiavari, farmhouse to folding. All stock is washed and inspected between rentals.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <CategoryListing items={itemsWithAvail} hasRange={hasRange} dateLabel={dateLabel} />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 2: Rewrite decor/page.tsx**

Same as above with slug `"decor"` and copy:

```tsx
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import CategoryListing from "@/components/shared/CategoryListing"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function DecorPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const from = searchParams.from ? new Date(searchParams.from) : null
  const to = searchParams.to ? new Date(searchParams.to) : null
  const hasRange = !!(from && to)
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined

  const items = await prisma.item.findMany({
    where: { category: { slug: "decor" }, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, subcategory: true, size: true,
      category: { select: { slug: true, name: true } },
    },
  })

  const itemsWithAvail = await Promise.all(items.map(async item => ({
    item: { ...item, stock: item.qty ?? 0 },
    avail: hasRange
      ? await getItemAvailability(item.id, from!, to!)
      : { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false },
  })))

  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="text-(--shop-ink-soft) hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Decor &amp; Dance Floor</span>
          </p>
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Decor &amp; Dance Floor</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            Dance floors, bistro lights, arches, linens, heaters — the finishing layers that make the photos.
          </p>
        </div>
      </section>
      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <CategoryListing items={itemsWithAvail} hasRange={hasRange} dateLabel={dateLabel} />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 3: Verify pages**

Open `http://localhost:3000/tables-and-chairs` and `http://localhost:3000/decor`. Expected: page headers + category listing (empty until seed data added in G1, but no errors).

---

## Task 9: Shop detail page `/shop/[slug]`

**Files:**
- Modify: `src/app/(public)/shop/[slug]/page.tsx`
- Create: `src/app/(public)/shop/[slug]/ItemDetail.tsx`
- Create: `src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx`
- Create: `src/app/(public)/shop/[slug]/TentConfigDetail.tsx`

The server page tries `Item` first, then `TentConfiguration`. It pre-computes the 35-day availability strip server-side and passes it as a prop.

- [ ] **Step 1: Create ThirtyDayStrip.tsx**

```tsx
"use client"
import { useRouter, useSearchParams } from "next/navigation"

type DayData = { date: string; available: number; total: number }

export default function ThirtyDayStrip({ days }: { days: DayData[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const pick = (date: string) => {
    const next = new URLSearchParams(params.toString())
    next.set("from", date)
    next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  return (
    <div>
      <div className="flex gap-3.5 text-xs text-(--shop-ink-soft) mb-2.5 uppercase tracking-[0.08em]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#e7f4ec] border border-[#2f7d52]" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#fdf3e2] border border-[#d99a3a]" /> Limited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#fbeae6] border border-[#c0613a]" /> Booked
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => {
          const pct = day.total > 0 ? day.available / day.total : 1
          let bg = "#e7f4ec", border = "#c3e0cd"
          if (day.available <= 0) { bg = "#fbeae6"; border = "#f3c8bc" }
          else if (pct <= 0.2) { bg = "#fdf3e2"; border = "#f5dfae" }
          const d = new Date(day.date)
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <button key={day.date}
              onClick={() => pick(day.date)}
              title={`${d.toLocaleDateString()} — ${day.available} of ${day.total} available`}
              className="rounded text-center cursor-pointer"
              style={{ background: bg, border: `1px solid ${border}`, padding: "7px 2px" }}>
              <div className="text-[9px] uppercase opacity-60 font-medium" style={{ fontWeight: isWeekend ? 700 : 500 }}>
                {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
              </div>
              <div className="text-[13px] font-semibold text-(--shop-ink) mt-0.5">{d.getDate()}</div>
              <div className="mono text-[9px] mt-0.5 text-(--shop-ink-soft)">{day.available}/{day.total}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ItemDetail.tsx**

```tsx
"use client"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Info } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import DateRangeField from "@/components/shared/DateRangeField"
import QtyStepper from "@/components/shared/QtyStepper"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { ItemDetail as ItemDetailType, AvailabilityResult } from "@/models/inventory"

type Props = {
  item: ItemDetailType
  avail: AvailabilityResult
  hasRange: boolean
}

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

export default function ItemDetail({ item, avail, hasRange }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null
  const days = start && end ? daysBetween(start, end) : 1

  const { lines, addToCart, updateLine } = useCart()
  const cartLine = lines.find(l => l.refId === item.id && l.kind === "item")
  const [qty, setQty] = useState(cartLine?.qty ?? 1)
  const overbook = hasRange && qty > avail.available

  const handleDateChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  const handleAddOrUpdate = () => {
    if (cartLine) {
      updateLine(item.id, "item", qty)
    } else {
      addToCart(item.id, "item", qty, item.name, Number(item.flatPrice))
    }
  }

  const subtotal = Number(item.flatPrice) * qty * days

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-6">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-(--shop-ink-soft)">Day rate</span>
        <span className="mono text-lg"><strong>${Number(item.flatPrice).toFixed(0)}</strong></span>
      </div>

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-2.5">Event dates</div>
        <DateRangeField start={start} end={end} onChange={handleDateChange} />
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-1.5">Quantity</div>
          <QtyStepper value={qty} min={1} max={item.stock ?? 99} onChange={setQty} />
        </div>
        <div className="text-right">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          {hasRange ? (
            <div className="text-[11px] text-(--shop-ink-soft) mt-1.5">
              Stock: {avail.stock} · Booked: {avail.booked}
            </div>
          ) : null}
        </div>
      </div>

      {overbook ? (
        <div className="mt-3.5 px-3 py-2.5 rounded-lg text-[12.5px] flex gap-2 items-start"
          style={{ background: "#fbeae6", color: "#c0613a" }}>
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>You've requested {qty} but only {avail.available} are free for these dates. Try fewer, different dates, or message us.</span>
        </div>
      ) : null}

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4 flex justify-between items-center">
        <div>
          <div className="text-sm text-(--shop-ink-soft)">{qty} × ${Number(item.flatPrice).toFixed(0)} × {days} day{days === 1 ? "" : "s"}</div>
          <div className="serif font-semibold leading-none mt-1" style={{ fontSize: 32 }}>
            ${subtotal.toLocaleString()}
          </div>
        </div>
        <button
          onClick={handleAddOrUpdate}
          disabled={overbook || qty < 1}
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
          style={{ background: overbook || qty < 1 ? undefined : "var(--shop-blue)" }}>
          {cartLine ? "Update quote" : "Add to quote"} <ArrowRight size={14} />
        </button>
      </div>

      <p className="mt-5 text-[13px] text-(--shop-ink-soft) leading-relaxed">
        <Info size={12} className="inline mr-1" />
        Reservations are held for 48 hours after we send the quote. Full payment due 14 days before delivery.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create TentConfigDetail.tsx**

```tsx
"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Info, AlertTriangle } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import DateRangeField from "@/components/shared/DateRangeField"
import QtyStepper from "@/components/shared/QtyStepper"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { TentConfigurationDetail, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationDetail
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

export default function TentConfigDetail({ config, avail, hasRange }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null
  const days = start && end ? daysBetween(start, end) : 1

  const { lines, addToCart, updateLine } = useCart()
  const cartLine = lines.find(l => l.refId === config.id && l.kind === "tentConfig")
  const [qty, setQty] = useState(cartLine?.qty ?? 1)
  const overbook = hasRange && qty > avail.available

  const handleDateChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  const subtotal = Number(config.flatPrice) * qty * days

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-6">
      {!avail.bomComplete ? (
        <div className="mb-4 px-3 py-2.5 rounded-lg text-xs flex gap-2 items-center"
          style={{ background: "#fdf3e2", color: "#a26b1d" }}>
          <AlertTriangle size={14} />
          BOM incomplete — contact us for exact availability before booking.
        </div>
      ) : null}

      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-(--shop-ink-soft)">Day rate</span>
        <span className="mono text-lg"><strong>${Number(config.flatPrice).toFixed(0)}</strong></span>
      </div>

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-2.5">Event dates</div>
        <DateRangeField start={start} end={end} onChange={handleDateChange} />
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-1.5">Quantity</div>
          <QtyStepper value={qty} min={1} max={Math.max(1, avail.available)} onChange={setQty} />
        </div>
        <AvailabilityBadge available={avail.available} stock={avail.available + avail.booked} hasRange={hasRange} />
      </div>

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4 flex justify-between items-center">
        <div>
          <div className="text-sm text-(--shop-ink-soft)">{qty} × ${Number(config.flatPrice).toFixed(0)} × {days} day{days === 1 ? "" : "s"}</div>
          <div className="serif font-semibold leading-none mt-1" style={{ fontSize: 32 }}>${subtotal.toLocaleString()}</div>
        </div>
        <button
          onClick={() => cartLine ? updateLine(config.id, "tentConfig", qty) : addToCart(config.id, "tentConfig", qty, config.name, Number(config.flatPrice))}
          disabled={overbook || qty < 1}
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
          style={{ background: overbook || qty < 1 ? undefined : "var(--shop-blue)" }}>
          {cartLine ? "Update quote" : "Add to quote"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite shop/[slug]/page.tsx**

```tsx
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getTentConfigAvailability, getItemDailyAvailability } from "@/services/inventoryService"
import ItemDetail from "./ItemDetail"
import TentConfigDetail from "./TentConfigDetail"
import ThirtyDayStrip from "./ThirtyDayStrip"

export const dynamic = "force-dynamic"

export default async function ShopDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { from?: string; to?: string }
}) {
  const from = searchParams.from ? new Date(searchParams.from) : null
  const to = searchParams.to ? new Date(searchParams.to) : null
  const hasRange = !!(from && to)

  // Try item first
  const item = await prisma.item.findUnique({
    where: { slug: params.slug, isActive: true },
    select: {
      id: true, slug: true, name: true, blurb: true, description: true,
      flatPrice: true, qty: true, size: true, subcategory: true,
      category: { select: { slug: true, name: true } },
    },
  })

  if (item) {
    const [avail, strip] = await Promise.all([
      hasRange
        ? getItemAvailability(item.id, from!, to!)
        : Promise.resolve({ available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }),
      getItemDailyAvailability(item.id, new Date(), 35),
    ])

    const itemDetail = { ...item, stock: item.qty ?? 0, spec: null, images: [] }

    return (
      <main>
        <section className="pt-10 pb-4" style={{ background: "var(--shop-paper)" }}>
          <div className="max-w-[1320px] mx-auto px-8 text-xs text-(--shop-ink-soft)">
            <a href="/" className="hover:text-(--shop-ink)">Home</a>
            {" / "}
            <a href={`/${item.category.slug}`} className="hover:text-(--shop-ink)">{item.category.name}</a>
            {" / "}
            <span className="text-(--shop-ink)">{item.name}</span>
          </div>
        </section>

        <section className="pb-20" style={{ background: "var(--shop-paper)" }}>
          <div className="max-w-[1320px] mx-auto px-8 pt-6 grid gap-16 items-start"
            style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            {/* Gallery placeholder */}
            <div>
              <div className="aspect-[4/3] bg-white border border-(--shop-line) rounded-xl" />
              <div className="grid grid-cols-4 gap-3 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="aspect-square bg-white border border-(--shop-line) rounded-lg" />
                ))}
              </div>
            </div>

            {/* Details + booking */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-blue) mb-1.5">
                {item.category.name}
              </div>
              <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>
                {item.name}
              </h1>
              {(item.size || item.subcategory) ? (
                <div className="flex gap-4 text-sm text-(--shop-ink-soft) mt-3">
                  {item.size ? <span><strong className="text-(--shop-ink)">{item.size}</strong></span> : null}
                  {item.subcategory ? <><span>·</span><span className="text-(--shop-ink)">{item.subcategory}</span></> : null}
                  <span>·</span>
                  <span><strong className="text-(--shop-ink)">{item.qty ?? "?"}</strong> in inventory</span>
                </div>
              ) : null}
              {item.blurb ? (
                <p className="mt-4 text-base text-(--shop-ink-soft) leading-relaxed">{item.blurb}</p>
              ) : null}

              <div className="mt-7">
                <Suspense fallback={null}>
                  <ItemDetail item={itemDetail as any} avail={avail} hasRange={hasRange} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* 35-day strip */}
        <section className="py-16 border-t border-(--shop-line)">
          <div className="max-w-[1320px] mx-auto px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-2">Next 35 days</p>
            <h3 className="serif font-medium mb-6" style={{ fontSize: 32 }}>
              What this item looks like over the next month
            </h3>
            <Suspense fallback={null}>
              <ThirtyDayStrip days={strip} />
            </Suspense>
          </div>
        </section>
      </main>
    )
  }

  // Try tent configuration
  const config = await prisma.tentConfiguration.findUnique({
    where: { slug: params.slug, isActive: true },
    select: {
      id: true, slug: true, name: true, blurb: true, description: true,
      flatPrice: true, widthFt: true, lengthFt: true, capacity: true,
      bomComplete: true, isActive: true,
    },
  })

  if (!config) notFound()

  const avail = hasRange
    ? await getTentConfigAvailability(config.id, from!, to!)
    : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: config.bomComplete, bottleneckParts: [] }

  return (
    <main>
      <section className="pt-10 pb-4" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8 text-xs text-(--shop-ink-soft)">
          <a href="/">Home</a> / <a href="/tents">Tents</a> / <span className="text-(--shop-ink)">{config.name}</span>
        </div>
      </section>

      <section className="pb-20" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8 pt-6 grid gap-16 items-start"
          style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          <div className="aspect-[4/3] bg-white border border-(--shop-line) rounded-xl" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-blue) mb-1.5">Tent</div>
            <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>{config.name}</h1>
            {(config.widthFt || config.capacity) ? (
              <div className="flex gap-4 text-sm text-(--shop-ink-soft) mt-3">
                {config.widthFt ? <span><strong className="text-(--shop-ink)">{config.widthFt}×{config.lengthFt} ft</strong></span> : null}
                {config.capacity ? <><span>·</span><span><strong className="text-(--shop-ink)">Up to {config.capacity}</strong></span></> : null}
              </div>
            ) : null}
            {config.blurb ? <p className="mt-4 text-base text-(--shop-ink-soft) leading-relaxed">{config.blurb}</p> : null}
            <div className="mt-7">
              <Suspense fallback={null}>
                <TentConfigDetail config={config as any} avail={avail} hasRange={hasRange} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verify a detail page renders**

If seed data is present, open `http://localhost:3000/shop/[any-real-slug]`. Otherwise check for TypeScript errors:

```bash
npx tsc --noEmit
```

Expected: no errors.

---

## Task 10: Quote page

**Files:**
- Modify: `src/app/(public)/quote/page.tsx`
- Create: `src/app/(public)/quote/QuotePage.tsx`

Multi-step: cart review → contact form → confirmation. Submits `POST /api/orders` with `CreateOrderPayload`.

- [ ] **Step 1: Create QuotePage.tsx**

```tsx
"use client"
import { useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, ArrowLeft, X, Info, CheckCircle } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import DateRangeField from "@/components/shared/DateRangeField"
import QtyStepper from "@/components/shared/QtyStepper"
import type { CreateOrderPayload } from "@/models/inventory"

type Step = "cart" | "contact" | "confirm"

const TAX_RATE = 0.06
const DELIVERY_FEE = 85

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function QuotePage() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null
  const hasRange = !!(start && end)
  const days = hasRange ? daysBetween(start!, end!) : 1

  const { lines, updateLine, removeLine, clearCart } = useCart()
  const [step, setStep] = useState<Step>("cart")
  const [orderId, setOrderId] = useState<number | null>(null)
  const [contact, setContact] = useState({
    firstName: "", lastName: "", email: "", phone: "", notes: "", venue: "",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty * days, 0)
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0
  const tax = (subtotal + delivery) * TAX_RATE
  const total = subtotal + delivery + tax

  const hasConflict = false // Real conflict check happens on submit (server validates)
  const canContinue = lines.length > 0 && hasRange && !hasConflict
  const contactValid = contact.firstName && contact.lastName && contact.email && contact.phone

  const handleDateChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`/quote?${next.toString()}`)
  }

  const handleSubmit = () => {
    if (!start || !end) return
    const payload: CreateOrderPayload = {
      pickupDate: start.toISOString().slice(0, 10),
      dropoffDate: end.toISOString().slice(0, 10),
      customer: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
      lines: lines.map(l => ({
        kind: l.kind,
        refId: l.refId,
        qty: l.qty,
        name: l.name,
        unitPrice: l.unitPrice,
      })),
      customerNotes: contact.notes || null,
      shipping: contact.venue ? { street: contact.venue, city: "", state: "ID", zipCode: "" } : null,
    }

    startTransition(async () => {
      setSubmitError(null)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.")
        return
      }
      setOrderId(json.data?.id ?? null)
      clearCart()
      setStep("confirm")
    })
  }

  return (
    <main>
      {/* Page header */}
      <section className="py-12" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Your Quote</span>
          </p>
          <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 56 }}>Your quote</h1>
          <p className="mt-2 text-base text-(--shop-ink-soft)">Review your list, confirm dates, and we'll come back within 4 business hours.</p>
        </div>
      </section>

      <section className="py-10 pb-20">
        <div className="max-w-[1320px] mx-auto px-8 grid gap-12 items-start"
          style={{ gridTemplateColumns: "1.6fr 1fr" }}>

          {/* Left: main content */}
          <div>
            {/* Date bar */}
            <div className="bg-white border border-(--shop-line) rounded-xl p-5 mb-6 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-blue) mb-1">Event dates</div>
                <div className="text-lg font-semibold">
                  {hasRange
                    ? `${start!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "No dates selected"}
                </div>
                {hasRange ? <div className="text-sm text-(--shop-ink-soft) mt-0.5">{days} rental day{days === 1 ? "" : "s"}</div> : null}
              </div>
              <DateRangeField start={start} end={end} onChange={handleDateChange} />
            </div>

            {/* Cart step */}
            {step === "cart" ? (
              lines.length === 0 ? (
                <div className="bg-white border border-dashed border-(--shop-line) rounded-xl p-16 text-center">
                  <h3 className="serif text-2xl font-medium mt-3 mb-2">Your quote is empty</h3>
                  <p className="text-sm text-(--shop-ink-soft) mb-5">Browse the inventory and add anything you'd like for your event.</p>
                  <Link href="/tents" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold text-white"
                    style={{ background: "var(--shop-blue)" }}>
                    Browse tents <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden">
                  {lines.map((line, idx) => (
                    <div key={`${line.kind}-${line.refId}`}
                      className="grid gap-5 p-4 items-center"
                      style={{
                        gridTemplateColumns: "72px 1fr auto auto auto",
                        borderBottom: idx < lines.length - 1 ? "1px solid #f0f2f5" : "none",
                      }}>
                      <div className="aspect-square bg-(--shop-paper) rounded-lg" />
                      <div>
                        {/* CartLine stores refId (numeric), not slug — render as text for now */}
                        <span className="serif text-xl font-medium text-(--shop-ink)">{line.name}</span>
                        <div className="text-xs text-(--shop-ink-soft) mt-0.5">
                          ${line.unitPrice.toFixed(0)}/day · {days} day{days === 1 ? "" : "s"}
                        </div>
                      </div>
                      <QtyStepper compact value={line.qty} min={1} max={99}
                        onChange={(q) => updateLine(line.refId, line.kind, q)} />
                      <div className="mono text-sm font-semibold text-right min-w-[72px]">
                        ${fmtCurrency(line.unitPrice * line.qty * days)}
                      </div>
                      <button onClick={() => removeLine(line.refId, line.kind)}
                        className="w-8 h-8 border border-(--shop-line) bg-white rounded-lg flex items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}

            {/* Contact step */}
            {step === "contact" ? (
              <div className="bg-white border border-(--shop-line) rounded-xl p-7">
                <h3 className="serif text-3xl font-medium mb-1">Your details</h3>
                <p className="text-sm text-(--shop-ink-soft) mb-6">We'll send your formal quote here within 4 business hours.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "First name *", key: "firstName", span: 1 },
                    { label: "Last name *", key: "lastName", span: 1 },
                    { label: "Phone *", key: "phone", span: 1 },
                    { label: "Email *", key: "email", span: 1, type: "email" },
                    { label: "Venue / address", key: "venue", span: 2 },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type ?? "text"}
                        value={(contact as any)[f.key]}
                        onChange={e => setContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                        inputMode={f.key === "phone" ? "tel" : f.key === "email" ? "email" : "text"}
                        autoComplete={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "on"}
                        className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue)"
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">
                      Anything else we should know?
                    </label>
                    <textarea
                      value={contact.notes}
                      onChange={e => setContact(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue) resize-y"
                    />
                  </div>
                </div>
                {submitError ? (
                  <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#fbeae6", color: "#c0613a" }} role="alert">
                    {submitError}
                  </div>
                ) : null}
                <div className="mt-7 flex justify-between">
                  <button onClick={() => setStep("cart")}
                    className="inline-flex items-center gap-1.5 text-sm text-(--shop-ink-soft) cursor-pointer">
                    <ArrowLeft size={13} /> Back to items
                  </button>
                  <button
                    disabled={!contactValid || isPending}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
                    style={{ background: contactValid && !isPending ? "var(--shop-blue)" : undefined }}>
                    {isPending ? "Sending…" : "Send quote request"} {isPending ? null : <ArrowRight size={14} />}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Confirm step */}
            {step === "confirm" ? (
              <div className="bg-white border border-(--shop-line) rounded-xl p-14 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "#e7f4ec" }}>
                  <CheckCircle size={28} className="text-(--shop-ok)" />
                </div>
                <h3 className="serif text-4xl font-medium">Quote on the way.</h3>
                <p className="text-sm text-(--shop-ink-soft) mt-4 max-w-sm mx-auto leading-relaxed">
                  We've received your request and are holding your items for 48 hours. Look for a formal quote in your inbox within 4 business hours.
                </p>
                {orderId ? (
                  <div className="mono mt-6 text-xs text-(--shop-ink-soft)">Reference: BPR-{orderId}</div>
                ) : null}
                <div className="mt-7">
                  <Link href="/" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold text-white"
                    style={{ background: "var(--shop-blue)" }}>
                    Back to home <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: estimate summary */}
          <aside className="bg-white border border-(--shop-line) rounded-xl p-6 sticky top-[170px]">
            <h4 className="serif text-2xl font-medium mb-4">Estimate</h4>
            <div className="flex flex-col gap-2.5 text-sm text-(--shop-ink-soft)">
              <div className="flex justify-between">
                <span>Subtotal ({lines.length} item{lines.length === 1 ? "" : "s"})</span>
                <span className="mono font-medium text-(--shop-ink)">${fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery &amp; setup</span>
                <span className="mono font-medium text-(--shop-ink)">{subtotal > 0 ? `$${DELIVERY_FEE}` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (est.)</span>
                <span className="mono font-medium text-(--shop-ink)">${fmtCurrency(tax)}</span>
              </div>
            </div>
            <div className="border-t border-(--shop-line)/60 mt-3.5 pt-3.5 flex justify-between items-baseline">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="serif font-semibold" style={{ fontSize: 32 }}>${fmtCurrency(total)}</span>
            </div>
            {step === "cart" ? (
              <>
                <button
                  disabled={!canContinue}
                  onClick={() => setStep("contact")}
                  className="mt-5 w-full py-3.5 rounded-full text-sm font-semibold text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  style={{ background: canContinue ? "var(--shop-blue)" : undefined }}>
                  Continue to contact info <ArrowRight size={14} />
                </button>
                {!hasRange ? (
                  <p className="mt-2.5 text-xs text-(--shop-ink-soft) text-center">Pick your event dates above to continue.</p>
                ) : null}
              </>
            ) : null}
            <p className="mt-4 text-xs text-(--shop-ink-soft) leading-relaxed">
              <Info size={12} className="inline mr-1" />
              Final total may vary based on site visit and final guest count.
            </p>
          </aside>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Rewrite quote/page.tsx**

```tsx
import { Suspense } from "react"
import QuotePage from "./QuotePage"

export default function QuoteRoute() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
      <QuotePage />
    </Suspense>
  )
}
```

- [ ] **Step 3: Verify quote page**

Open `http://localhost:3000/quote`. Expected: "Your quote is empty" state with "Browse tents" link. No JS errors.

- [ ] **Step 4: Check CartContext has removeLine(refId, kind)**

Open `src/contexts/CartContext.tsx`. Ensure `removeLine` accepts `(refId: number, kind: CartLineKind)`:

```typescript
const removeLine = (refId: number, kind: CartLineKind) => {
  setLines(prev => prev.filter(l => !(l.refId === refId && l.kind === kind)))
}
```

Fix the signature if G3 implemented it as `removeLine(itemId: number)`.

---

## Task 11: Gallery, FAQ, Contact pages

**Files:**
- Modify: `src/app/(public)/gallery/page.tsx`
- Modify: `src/app/(public)/faq/page.tsx`
- Modify: `src/app/(public)/contact/page.tsx`

All are static server components. No data fetching.

- [ ] **Step 1: Rewrite gallery/page.tsx**

```tsx
const GALLERY_ITEMS = [
  "Backyard wedding · Eagle",
  "Garden City brewery launch",
  "Sawtooth vineyard reception",
  "Boise Co-Op gala",
  "North End block party",
  "Capitol Park reception",
  "Lucky Peak engagement",
  "BSU homecoming tent",
  "Nampa family reunion",
]

export default function GalleryPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Real Boise events</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-xl leading-relaxed">
            A peek inside the tents we've put up around the Treasure Valley over the years.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-[1320px] mx-auto px-8">
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {GALLERY_ITEMS.map((label, i) => (
              <div key={i} className="bg-(--shop-paper) rounded-xl overflow-hidden border border-(--shop-line)"
                style={{ aspectRatio: i % 5 === 0 ? "4/5" : "4/3" }}>
                <div className="w-full h-full flex items-end p-4">
                  <span className="text-xs text-(--shop-ink-soft)">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Rewrite faq/page.tsx**

```tsx
const FAQS = [
  { q: "How far in advance should I book?", a: "For peak season (May–October), 6–9 months out is ideal. We do take last-minute bookings when stock allows — check live availability above." },
  { q: "Do you set up and take down?", a: "Yes. Setup and teardown are included in every quote. We deliver the day before and pick up the morning after." },
  { q: "What if the weather changes?", a: "Our tents are rated for sustained winds up to 40 mph. We monitor forecasts and will recommend sidewalls or extra ballast if needed." },
  { q: "What's your cancellation policy?", a: "Full refund up to 30 days out. 50% refund 14–30 days. Inside 14 days, deposit is non-refundable but we offer a date change credit." },
  { q: "Do you service outside Boise?", a: "Yes — Meridian, Eagle, Nampa, Caldwell, Kuna, Garden City, and most of the Treasure Valley. Delivery fee scales with distance." },
  { q: "Can I see a tent before booking?", a: "Absolutely. Schedule a 20-minute showroom visit and we'll walk you through every size and finish." },
]

export default function FAQPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Common questions</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            The things people ask the most. If yours isn't here, just call us.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-[1320px] mx-auto px-8">
          <div className="grid grid-cols-2 gap-7">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white border border-(--shop-line) rounded-xl p-7">
                <h3 className="serif text-xl font-medium">{f.q}</h3>
                <p className="mt-2.5 text-sm text-(--shop-ink-soft) leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Rewrite contact/page.tsx**

```tsx
"use client"
import { MapPin, Phone, Mail } from "lucide-react"

export default function ContactPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Get in touch</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            We answer the phone. Same-day quotes for most inquiries.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-[1320px] mx-auto px-8 grid gap-14" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <h3 className="serif text-2xl font-medium mb-4">Visit the showroom</h3>
            <div className="flex flex-col gap-4 text-sm text-(--shop-ink-soft) leading-relaxed">
              <div className="flex gap-3.5 items-start">
                <MapPin size={18} className="text-(--shop-blue) shrink-0 mt-0.5" />
                <span>2815 W Overland Rd<br />Boise, ID 83705</span>
              </div>
              <div className="flex gap-3.5 items-center">
                <Phone size={18} className="text-(--shop-blue) shrink-0" />
                <a href="tel:+12083063079" className="hover:text-(--shop-ink)">(208) 306-3079</a>
              </div>
              <div className="flex gap-3.5 items-center">
                <Mail size={18} className="text-(--shop-blue) shrink-0" />
                <a href="mailto:hello@boisepartyrentals.com" className="hover:text-(--shop-ink)">hello@boisepartyrentals.com</a>
              </div>
            </div>
            <div className="mt-7 aspect-[4/3] bg-(--shop-paper) rounded-xl border border-(--shop-line)" />
          </div>
          <div>
            <h3 className="serif text-2xl font-medium mb-1">Send us a note</h3>
            <p className="text-sm text-(--shop-ink-soft) mb-5 leading-relaxed">
              For specific items + dates, the quote form is faster. For everything else, here:
            </p>
            <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
              {[
                { label: "Name", name: "name", type: "text" },
                { label: "Email", name: "email", type: "email" },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">{f.label}</label>
                  <input name={f.name} type={f.type}
                    className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue)" />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">Message</label>
                <textarea name="message" rows={4}
                  className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue) resize-y" />
              </div>
              <div>
                <button type="submit"
                  className="px-5 py-3 rounded-full text-sm font-semibold text-white"
                  style={{ background: "var(--shop-blue)" }}>
                  Send message
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Verify all three pages render**

Open `/gallery`, `/faq`, `/contact`. Expected: page layouts render with static content, no JS errors.

---

## Task 12: Build check

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: build completes successfully. Note any warnings but treat them as non-blocking unless they are errors.

- [ ] **Step 3: Smoke test the golden paths**

With `npm run dev`:

1. **`/`** — Hero renders, categories section renders, how-it-works renders
2. **`/tents`** — page header renders, no crash (may be empty without seed data)
3. **`/tables-and-chairs`** — page header renders
4. **`/decor`** — page header renders
5. **`/?from=2026-06-06&to=2026-06-08`** — hero picks up dates (DateRangeField shows the range), featured items section renders
6. **`/tents?from=2026-06-06&to=2026-06-08`** — page header shows date filter
7. **`/quote`** — "Your quote is empty" state renders with "Browse tents" link
8. **`/gallery`** — 9-item grid renders
9. **`/faq`** — 6-question grid renders
10. **`/contact`** — two-column layout with form renders

- [ ] **Step 4: Commit (reminder — Trevor commits)**

Per project rules, do NOT run `git add` or `git commit`. Flag to Trevor that G4 is ready to commit.

---

## Self-review Checklist

**Spec coverage:**
- ✅ Home page — hero, categories, why-us, featured items, how-it-works, CTA
- ✅ Tents page — tent config cards + items
- ✅ Tables & Chairs page — CategoryListing
- ✅ Decor page — CategoryListing
- ✅ Shop detail `/shop/[slug]` — item and tent config detail, 35-day strip
- ✅ Quote page — 3-step flow (cart → contact → confirm)
- ✅ Gallery, FAQ, Contact — static

**Gaps / deferred:**
- Real photos: all images are placeholder `<div>` elements. Add real images post-G4 when image upload is implemented.
- Contact form submission: the form in `/contact` does `e.preventDefault()` but doesn't submit anywhere. A real form action can be wired up in a future iteration.
- Category page breadcrumb links: `/tents`, `/tables-and-chairs`, `/decor` slugs are hardcoded. If slugs change in DB, breadcrumbs break. Acceptable for now.
- The `ShopHeader` DateRangeField (created in G3) drives URL updates site-wide. The per-page DateRangeField in the tents page header is display-only; wire it up to `router.replace` if interactive per-page date switching is needed.

**Type consistency:**
- `CartLine.name` added consistently in models + CartContext
- `addToCart(refId, kind, qty, name, unitPrice)` — 5 args, consistent across all call sites
- `updateLine(refId, kind, qty)` — 3 args with kind, all call sites updated
- `removeLine(refId, kind)` — 2 args with kind, all call sites updated
- `AvailabilityResult.stock` used (matches G2 API output shape)
- `item.qty` for DB field (Prisma schema), `item.stock` for display/logic layer
