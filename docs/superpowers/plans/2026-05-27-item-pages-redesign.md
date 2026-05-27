# Item Pages Redesign — Remove Modals, Add Availability Calendar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all intercepting-route modal infrastructure from item listing pages, add direct "Add to quote" controls to tent config cards, and replace the ThirtyDayStrip availability row with a per-card calendar popover that shows 60-day color-coded availability.

**Architecture:** The three category pages (tents, tables-and-chairs, decor) currently use Next.js parallel route `@modal` slots to intercept `/category/[slug]` navigations and render a Dialog. This whole system is deleted. Item cards become fully self-contained: they render add-to-cart controls inline and expose an availability calendar popover triggered by a small calendar button. The popover lazily fetches a new API endpoint `/api/inventory/daily-availability` that returns per-day availability for any item or tent config.

**Tech Stack:** Next.js App Router · React 19 · Tailwind 4 · Prisma · shadcn/ui Dialog · Lucide icons · `useCart` / `useInventoryMode` contexts

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/services/inventoryService.ts` | Add `getTentConfigDailyAvailability` |
| Create | `src/app/api/inventory/daily-availability/route.ts` | New API: daily availability for item or config |
| Create | `src/components/shared/AvailabilityCalendarPopover.tsx` | Calendar button + Dialog showing 60-day availability |
| Modify | `src/components/shared/ItemCard-Grid.tsx` | Remove Link wrappers; add AvailabilityCalendarPopover |
| Modify | `src/components/shared/ItemCard-List.tsx` | Remove Link wrappers; add AvailabilityCalendarPopover |
| Modify | `src/components/shared/TentConfigCard.tsx` | Convert to client component; add Add button + AvailabilityCalendarPopover |
| Modify | `src/app/(public)/tents/layout.tsx` | Remove modal slot |
| Modify | `src/app/(public)/decor/layout.tsx` | Remove modal slot |
| Modify | `src/app/(public)/tables-and-chairs/layout.tsx` | Remove modal slot |
| Delete | `src/app/(public)/tents/@modal/` | Entire folder |
| Delete | `src/app/(public)/tents/[slug]/` | Entire folder |
| Delete | `src/app/(public)/decor/@modal/` | Entire folder |
| Delete | `src/app/(public)/decor/[slug]/` | Entire folder |
| Delete | `src/app/(public)/tables-and-chairs/@modal/` | Entire folder |
| Delete | `src/app/(public)/tables-and-chairs/[slug]/` | Entire folder |
| Delete | `src/components/shared/modals/ShopItemModal.tsx` | No longer used |
| Delete | `src/components/shared/modals/ShopItemModal-ItemBooking.tsx` | No longer used |
| Delete | `src/components/shared/modals/ShopItemModal-TentConfigBooking.tsx` | No longer used |
| Delete | `src/components/shared/ThirtyDayStrip.tsx` | Replaced by AvailabilityCalendarPopover |
| Delete | `src/lib/item-url.ts` | No longer used |

---

## Task 1: Add `getTentConfigDailyAvailability` to inventoryService

**Files:**
- Modify: `src/services/inventoryService.ts` (append after `getItemDailyAvailability` at line ~401)

- [ ] **Step 1: Add the function** — append this export to `src/services/inventoryService.ts` immediately after the `getItemDailyAvailability` function (around line 401):

```typescript
/**
 * Returns per-day availability for a tent configuration over `days` days
 * starting at `startDate`. For each day, computes the minimum buildable
 * count across all BOM parts. Uses one DB query per BOM part for the
 * whole range, then distributes per-day in memory.
 *
 * Returns all-zeros if the BOM is incomplete or the config doesn't exist.
 */
export async function getTentConfigDailyAvailability(
  configId: number,
  startDate: Date,
  days: number = 60,
): Promise<{ date: string; available: number; total: number }[]> {
  const rangeEnd = new Date(startDate)
  rangeEnd.setDate(rangeEnd.getDate() + days)

  const config = await prisma.tentConfiguration.findUnique({
    where: { id: configId },
    include: {
      bomParts: {
        include: {
          tentPart: { select: { id: true, qty: true, isSerialized: true } },
        },
      },
    },
  })

  const zeros = Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: d.toISOString().slice(0, 10), available: 0, total: 0 }
  })

  if (!config || !config.bomComplete || config.bomParts.length === 0) return zeros

  // Per-part: load stock + all overlapping order lines
  const partData = await Promise.all(
    config.bomParts.map(async (row) => {
      const stock =
        row.tentPart.isSerialized && row.tentPart.qty === null
          ? await prisma.serializedUnit.count({
              where: { tentPartId: row.tentPart.id, status: "available" },
            })
          : (row.tentPart.qty ?? 0)

      const lines = await prisma.orderLineItem.findMany({
        where: {
          tentConfigId: { not: null },
          order: {
            startDate: { lt: rangeEnd },
            dueDateEnd: { gt: startDate },
            state: { consumesInventory: true },
          },
          tentConfig: { bomParts: { some: { tentPartId: row.tentPart.id } } },
        },
        select: {
          qty: true,
          order: { select: { startDate: true, dueDateEnd: true } },
          tentConfig: {
            select: {
              bomParts: {
                where: { tentPartId: row.tentPart.id },
                select: { qtyRequired: true },
              },
            },
          },
        },
      })

      return { qtyRequired: row.qtyRequired, stock, lines }
    }),
  )

  return zeros.map(({ date }) => {
    const day = new Date(date)
    day.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    let minAvail = Infinity
    let minTotal = Infinity

    for (const part of partData) {
      const bookedQty = part.lines
        .filter(
          (l) =>
            l.order.startDate !== null &&
            l.order.dueDateEnd !== null &&
            l.order.startDate <= dayEnd &&
            l.order.dueDateEnd >= day,
        )
        .reduce((sum, l) => sum + l.qty * (l.tentConfig?.bomParts[0]?.qtyRequired ?? 1), 0)

      minAvail = Math.min(minAvail, Math.floor(Math.max(0, part.stock - bookedQty) / part.qtyRequired))
      minTotal = Math.min(minTotal, Math.floor(part.stock / part.qtyRequired))
    }

    return {
      date,
      available: minAvail === Infinity ? 0 : minAvail,
      total: minTotal === Infinity ? 0 : minTotal,
    }
  })
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `inventoryService.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/inventoryService.ts
git commit -m "feat: add getTentConfigDailyAvailability to inventoryService"
```

---

## Task 2: Create daily-availability API route

**Files:**
- Create: `src/app/api/inventory/daily-availability/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// GET /api/inventory/daily-availability?itemId=5
// GET /api/inventory/daily-availability?configId=5
// Returns 60 days of per-day availability starting today.
import { NextResponse } from "next/server"
import { getItemDailyAvailability, getTentConfigDailyAvailability } from "@/services/inventoryService"
import { getInventoryMode } from "@/lib/settings"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemIdStr = searchParams.get("itemId")
  const configIdStr = searchParams.get("configId")

  if (!itemIdStr && !configIdStr) {
    return NextResponse.json({ data: null, error: "itemId or configId required" }, { status: 400 })
  }

  const mode = await getInventoryMode()

  // Off mode: no availability data
  if (mode === "off") {
    return NextResponse.json({ data: { days: [] }, error: null })
  }

  const startDate = new Date()
  startDate.setHours(0, 0, 0, 0)
  const days = 60

  // Fully in stock: all days available
  if (mode === "fully_in_stock") {
    const syntheticDays = Array.from({ length: days }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      return { date: d.toISOString().slice(0, 10), available: 9999, total: 9999 }
    })
    return NextResponse.json({ data: { days: syntheticDays }, error: null })
  }

  // mode === "on"
  if (itemIdStr) {
    const itemId = parseInt(itemIdStr, 10)
    if (isNaN(itemId)) {
      return NextResponse.json({ data: null, error: "Invalid itemId" }, { status: 400 })
    }
    const result = await getItemDailyAvailability(itemId, startDate, days)
    return NextResponse.json({ data: { days: result }, error: null })
  }

  const configId = parseInt(configIdStr!, 10)
  if (isNaN(configId)) {
    return NextResponse.json({ data: null, error: "Invalid configId" }, { status: 400 })
  }
  const result = await getTentConfigDailyAvailability(configId, startDate, days)
  return NextResponse.json({ data: { days: result }, error: null })
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/inventory/daily-availability/route.ts
git commit -m "feat: add /api/inventory/daily-availability route"
```

---

## Task 3: Create AvailabilityCalendarPopover component

**Files:**
- Create: `src/components/shared/AvailabilityCalendarPopover.tsx`

This component renders a small calendar-days icon button. On click, it opens a shadcn Dialog with a monthly calendar. Days are color-coded by availability (green/yellow/red). Data is fetched lazily on first open. User can navigate months within the 60-day window.

- [ ] **Step 1: Create the file**

```typescript
"use client"
import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useInventoryMode } from "@/contexts/InventoryModeContext"

type DayData = { date: string; available: number; total: number }

type Props = {
  itemId?: number
  configId?: number
  name: string
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DOW = ["S","M","T","W","T","F","S"]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: d, inMonth: d.getMonth() === month }
  })
  while (cells.length > 7 && cells.slice(-7).every((c) => !c.inMonth)) cells.splice(-7)
  return cells
}

function dayStyle(data: DayData | undefined, isPast: boolean) {
  if (isPast || !data) return { bg: "#f5f7fa", fg: "#c5cad3", border: "#e4e7ec" }
  if (data.available <= 0) return { bg: "#fbeae6", fg: "#c0613a", border: "#f3c8bc" }
  const pct = data.total > 0 ? data.available / data.total : 1
  if (pct <= 0.2) return { bg: "#fdf3e2", fg: "#a26b1d", border: "#f5dfae" }
  return { bg: "#e7f4ec", fg: "#2f7d52", border: "#c3e0cd" }
}

export default function AvailabilityCalendarPopover({ itemId, configId, name }: Props) {
  const mode = useInventoryMode()
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<DayData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  // Hide entirely when inventory tracking is off
  if (mode === "off") return null

  const handleOpen = async () => {
    setOpen(true)
    if (days !== null || loading) return
    setLoading(true)
    try {
      const qs = itemId != null ? `itemId=${itemId}` : `configId=${configId}`
      const res = await fetch(`/api/inventory/daily-availability?${qs}`)
      const json = await res.json()
      if (json.data?.days) setDays(json.data.days)
    } finally {
      setLoading(false)
    }
  }

  const navMonth = (dir: number) =>
    setView((v) => {
      const m = v.month + dir
      if (m < 0) return { year: v.year - 1, month: 11 }
      if (m > 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: m }
    })

  const dayMap = new Map<string, DayData>()
  days?.forEach((d) => dayMap.set(d.date, d))

  const cells = monthGrid(view.year, view.month)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-(--shop-ink-soft) hover:text-(--shop-ink) hover:bg-(--shop-paper) transition-colors cursor-pointer"
        aria-label={`Check availability calendar for ${name}`}
      >
        <CalendarDays size={13} />
        <span>Dates</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 bg-(--color-background)">
          <DialogTitle className="sr-only">Availability — {name}</DialogTitle>

          <div className="p-5">
            {/* Header */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--shop-ink-soft)">
                Availability
              </p>
              <h3 className="serif font-medium text-xl mt-0.5 leading-tight">{name}</h3>
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-[11px] text-(--shop-ink-soft) mb-4 flex-wrap">
              {[
                { bg: "#e7f4ec", border: "#c3e0cd", label: "Available" },
                { bg: "#fdf3e2", border: "#f5dfae", label: "Limited" },
                { bg: "#fbeae6", border: "#f3c8bc", label: "Booked" },
              ].map(({ bg, border, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm inline-block shrink-0"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => navMonth(-1)}
                className="p-1.5 rounded hover:bg-(--shop-paper) text-(--shop-ink-soft) hover:text-(--shop-ink) transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="serif font-medium text-base">
                {MONTH_NAMES[view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={() => navMonth(1)}
                className="p-1.5 rounded hover:bg-(--shop-paper) text-(--shop-ink-soft) hover:text-(--shop-ink) transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="py-10 text-center text-(--shop-ink-soft) text-sm">Loading…</div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {DOW.map((d, i) => (
                  <div
                    key={i}
                    className="text-[10px] uppercase text-(--shop-ink-soft) text-center py-1 font-medium tracking-wider"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((c, i) => {
                  if (!c.inMonth) return <div key={i} className="aspect-square" />
                  const dateStr = c.date.toISOString().slice(0, 10)
                  const data = dayMap.get(dateStr)
                  const isPast = c.date < today
                  const { bg, fg, border } = dayStyle(data, isPast)
                  return (
                    <div
                      key={i}
                      className="aspect-square flex flex-col items-center justify-center rounded-md"
                      style={{ background: bg, border: `1px solid ${border}`, color: fg }}
                    >
                      <span className="text-[12px] font-semibold leading-none">
                        {c.date.getDate()}
                      </span>
                      {data && !isPast ? (
                        <span className="text-[9px] font-medium mt-0.5 leading-none opacity-80">
                          {data.available}/{data.total}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}

            <p className="mt-4 text-[11px] text-(--shop-ink-soft)">
              Showing next 60 days · counts reflect current bookings
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/AvailabilityCalendarPopover.tsx
git commit -m "feat: add AvailabilityCalendarPopover component"
```

---

## Task 4: Update ItemCard-Grid

**Files:**
- Modify: `src/components/shared/ItemCard-Grid.tsx`

Changes:
1. Remove `Link` import and `itemUrl` import
2. Convert the image block from `<Link href={...}>` to a plain `<div>`
3. Convert the name from `<Link href={...}>` to a plain `<span>`
4. Import `AvailabilityCalendarPopover` and add a "Dates" button next to the availability badge

- [ ] **Step 1: Replace the full file content**

```typescript
"use client"
import Image from "next/image"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import AvailabilityCalendarPopover from "@/components/shared/AvailabilityCalendarPopover"
import QtyStepper from "@/components/shared/QtyStepper"
import { ITEM_IMAGES } from "@/lib/item-images"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
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
  const mode = useInventoryMode()
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.qty ?? 99)
  const imgSrc = ITEM_IMAGES[item.slug] ?? null

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      {/* Image — no longer a link */}
      <div className="aspect-4/3 relative bg-(--shop-paper)">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-sm p-2 text-center">
            {item.name}
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="serif text-xl md:text-2xl font-medium leading-tight text-(--shop-ink)">
            {item.name}
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
          <p className="text-sm text-(--shop-ink-soft) mt-3 mb-4 leading-relaxed flex-1 hidden sm:block">{item.blurb}</p>
        ) : <div className="flex-1" />}

        {mode === "off" ? (
          <div className="mt-2">
            <a href="/contact" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-(--shop-blue) text-white">
              Contact Us
            </a>
          </div>
        ) : (
          <div className="mt-2">
            {/* Availability row */}
            <div className="flex items-center gap-2 mb-2">
              <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
              <AvailabilityCalendarPopover itemId={item.id} name={item.name} />
            </div>
            {/* Add / stepper row */}
            <div className="flex justify-end">
              {cartLine ? (
                <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
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
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ItemCard-Grid.tsx
git commit -m "feat: remove modal links and add availability calendar to ItemCard-Grid"
```

---

## Task 5: Update ItemCard-List

**Files:**
- Modify: `src/components/shared/ItemCard-List.tsx`

Changes:
1. Remove `Link` import and `itemUrl` import
2. Convert both image and name links to non-navigating elements
3. Add `AvailabilityCalendarPopover` in the availability positions (desktop col 3, mobile row)

- [ ] **Step 1: Replace the full file content**

```typescript
"use client"
import Image from "next/image"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import AvailabilityCalendarPopover from "@/components/shared/AvailabilityCalendarPopover"
import QtyStepper from "@/components/shared/QtyStepper"
import { ITEM_IMAGES } from "@/lib/item-images"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
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
  const mode = useInventoryMode()
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.qty ?? 99)
  const imgSrc = ITEM_IMAGES[item.slug] ?? null

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-3.5 flex gap-3.5 items-start md:grid md:gap-5 md:items-center md:p-4 md:grid-cols-[96px_1fr_auto_auto_auto]">

      {/* Col 1: Image — no longer a link */}
      <div className="shrink-0">
        <div className="w-18 md:w-auto aspect-4/3 relative rounded-lg md:rounded-xl overflow-hidden bg-(--shop-paper)">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 72px, 96px"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-xs p-1 text-center leading-tight">
              {item.name}
            </div>
          )}
        </div>
      </div>

      {/* Col 2: Name + subcategory + blurb + mobile controls */}
      <div className="flex-1 min-w-0">
        <h3 className="serif text-[1.05rem] md:text-xl font-medium leading-tight text-(--shop-ink)">
          {item.name}
        </h3>
        {item.subcategory ? (
          <div className="text-xs text-(--shop-ink-soft) mt-0.5">{item.subcategory}</div>
        ) : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-1.5 leading-snug max-w-lg hidden md:block">{item.blurb}</p>
        ) : null}

        {/* Mobile-only: availability + calendar + price + add button */}
        <div className="flex items-center gap-2 mt-2.5 md:hidden flex-wrap">
          {mode === "off" ? null : (
            <>
              <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
              <AvailabilityCalendarPopover itemId={item.id} name={item.name} />
            </>
          )}
          <div className="ml-auto mono text-sm whitespace-nowrap">
            {Number(item.flatPrice) > 0
              ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><span className="text-(--shop-ink-soft) text-xs">/day</span></>
              : <strong className="text-(--shop-blue)">Call</strong>}
          </div>
          {mode === "off" ? (
            <a href="/contact" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 bg-(--shop-blue) text-white">
              Contact Us
            </a>
          ) : cartLine ? (
            <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
          ) : (
            <button
              disabled={disabled}
              onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Col 3: Availability + calendar button (desktop only) */}
      {mode !== "off" ? (
        <div className="hidden md:flex items-center gap-1.5">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          <AvailabilityCalendarPopover itemId={item.id} name={item.name} />
        </div>
      ) : null}

      {/* Col 4: Price (desktop only) */}
      <div className="hidden md:block mono text-sm text-right">
        {Number(item.flatPrice) > 0
          ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><div className="text-(--shop-ink-soft) text-xs">per day</div></>
          : <strong className="text-(--shop-blue)">Call</strong>}
      </div>

      {/* Col 5: Add button or Contact Us (desktop only) */}
      <div className="hidden md:block">
        {mode === "off" ? (
          <a href="/contact" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold bg-(--shop-blue) text-white">
            Contact Us
          </a>
        ) : cartLine ? (
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
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ItemCard-List.tsx
git commit -m "feat: remove modal links and add availability calendar to ItemCard-List"
```

---

## Task 6: Convert TentConfigCard to client component

**Files:**
- Modify: `src/components/shared/TentConfigCard.tsx`

Changes:
1. Add `"use client"` directive
2. Import `useCart`, `useInventoryMode`, `QtyStepper`, `Plus`, `AvailabilityCalendarPopover`
3. Remove the outer `<Link>` wrapper (the whole card was a link)
4. Add "Add to quote" / `QtyStepper` in the bottom right (same pattern as ItemCardGrid)
5. Add `AvailabilityCalendarPopover` next to the AvailabilityBadge
6. The card needs new props: `hasRange`, `cartLine`, `onAdd`, `onUpdate` — OR use useCart internally (preferred: use useCart internally since tent configs aren't batched like items)

Use `useCart` internally (simpler, same approach as ShopItemModalTentConfigBooking had). The card gets `config`, `avail`, and `hasRange` from its parent.

- [ ] **Step 1: Replace the full file content**

```typescript
"use client"
import Image from "next/image"
import { AlertTriangle, Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import AvailabilityCalendarPopover from "@/components/shared/AvailabilityCalendarPopover"
import QtyStepper from "@/components/shared/QtyStepper"
import { TENT_IMAGES } from "@/lib/tent-images"
import { useCart } from "@/contexts/CartContext"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
import type { TentConfigurationSummary, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

export default function TentConfigCard({ config, avail, hasRange }: Props) {
  const mode = useInventoryMode()
  const { lines, addToCart, updateLine } = useCart()
  const imgSrc = TENT_IMAGES[config.slug] ?? null
  const cartLine = lines.find((l) => l.refId === config.id && l.kind === "tentConfig") ?? null
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? Math.max(1, avail.available + (cartLine?.qty ?? 0)) : 99

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      {/* Image — no longer a link */}
      <div className="aspect-4/3 relative bg-(--shop-paper)">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={config.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-sm">
            {config.name}
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <h3 className="serif text-xl md:text-2xl font-medium text-(--shop-ink) leading-tight">
            {config.name}
          </h3>
          <span className="mono text-sm whitespace-nowrap">
            {Number(config.flatPrice) > 0 ? (
              <>
                <strong>${Number(config.flatPrice).toFixed(0)}</strong>
                <span className="text-(--shop-ink-soft)">/day</span>
              </>
            ) : (
              <strong className="text-(--shop-blue)">Call</strong>
            )}
          </span>
        </div>

        <div className="flex gap-2 text-xs text-(--shop-ink-soft) mb-3 flex-wrap">
          {config.widthFt ? <span>{config.widthFt}×{config.lengthFt} ft</span> : null}
          {config.capacity ? (
            <>
              <span>·</span>
              <span>Up to {config.capacity}</span>
            </>
          ) : null}
        </div>

        {config.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4 hidden sm:block flex-1">{config.blurb}</p>
        ) : <div className="flex-1" />}

        {!avail.bomComplete ? (
          <div className="mb-3 inline-flex items-center gap-1 text-xs text-(--shop-warn)">
            <AlertTriangle size={12} /> Contact for exact pricing
          </div>
        ) : null}

        {mode === "off" ? (
          <div className="mt-2">
            <a href="/contact" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-(--shop-blue) text-white">
              Contact Us
            </a>
          </div>
        ) : (
          <div className="mt-2">
            {/* Availability row */}
            <div className="flex items-center gap-2 mb-2">
              <AvailabilityBadge stock={avail.stock} available={avail.available} hasRange={hasRange} />
              <AvailabilityCalendarPopover configId={config.id} name={config.name} />
            </div>
            {/* Add / stepper row */}
            <div className="flex justify-end">
              {cartLine ? (
                <QtyStepper
                  compact
                  value={cartLine.qty}
                  min={1}
                  max={maxQty}
                  onChange={(q) => updateLine(config.id, "tentConfig", q)}
                />
              ) : (
                <button
                  disabled={disabled}
                  onClick={() => addToCart(config.id, "tentConfig", 1, config.name, Number(config.flatPrice))}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Note: `TentConfigCard` is used in `TentsListing.tsx` which is a client component — the new client directive is compatible.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/TentConfigCard.tsx
git commit -m "feat: convert TentConfigCard to client component with Add button and availability calendar"
```

---

## Task 7: Delete modal infrastructure and simplify layouts

**Files:**
- Modify: `src/app/(public)/tents/layout.tsx`
- Modify: `src/app/(public)/decor/layout.tsx`
- Modify: `src/app/(public)/tables-and-chairs/layout.tsx`
- Delete: all `@modal/` and `[slug]/` folders for all three categories
- Delete: `src/components/shared/modals/ShopItemModal.tsx`
- Delete: `src/components/shared/modals/ShopItemModal-ItemBooking.tsx`
- Delete: `src/components/shared/modals/ShopItemModal-TentConfigBooking.tsx`
- Delete: `src/components/shared/ThirtyDayStrip.tsx`
- Delete: `src/lib/item-url.ts`

- [ ] **Step 1: Simplify all three layouts** — replace each with a passthrough that has no modal slot:

`src/app/(public)/tents/layout.tsx`:
```typescript
export default function TentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

`src/app/(public)/decor/layout.tsx`:
```typescript
export default function DecorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

`src/app/(public)/tables-and-chairs/layout.tsx`:
```typescript
export default function TablesAndChairsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 2: Delete all modal route folders and slug pages**

```bash
rm -rf \
  "src/app/(public)/tents/@modal" \
  "src/app/(public)/tents/[slug]" \
  "src/app/(public)/decor/@modal" \
  "src/app/(public)/decor/[slug]" \
  "src/app/(public)/tables-and-chairs/@modal" \
  "src/app/(public)/tables-and-chairs/[slug]"
```

- [ ] **Step 3: Delete now-unused modal components and utilities**

```bash
rm \
  src/components/shared/modals/ShopItemModal.tsx \
  src/components/shared/modals/ShopItemModal-ItemBooking.tsx \
  src/components/shared/modals/ShopItemModal-TentConfigBooking.tsx \
  src/components/shared/ThirtyDayStrip.tsx \
  src/lib/item-url.ts
```

- [ ] **Step 4: Type check — expect clean output**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1
```

Expected: no errors. If there are "cannot find module" errors for deleted files, trace where they're imported and remove those imports too.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove modal infrastructure, slug pages, and unused utilities"
```

---

## Task 8: Final type check and build verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1
```

Expected: **zero errors**. Fix any that appear before continuing.

- [ ] **Step 2: Verify no dead imports remain**

```bash
grep -r "item-url\|ThirtyDayStrip\|ShopItemModal\|scroll={false}" src/ --include="*.tsx" --include="*.ts"
```

Expected: no matches. If any appear, remove those imports/usages.

- [ ] **Step 3: Verify no @modal or [slug] routes remain for the three categories**

```bash
find "src/app/(public)/tents" "src/app/(public)/decor" "src/app/(public)/tables-and-chairs" -type f | sort
```

Expected output: only `page.tsx`, `layout.tsx`, and (for tents) `TentsListing.tsx` remain.

- [ ] **Step 4: Commit cleanup if any fixes were made**

```bash
git add -A
git commit -m "fix: cleanup remaining dead imports after modal removal"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|---|---|
| Remove all modal logic and URL routing | Task 7 |
| Tents get "Add" button on card bottom right (like tables/chairs) | Task 6 |
| Availability calendar popover on every card | Tasks 3, 4, 5, 6 |
| Calendar works for all item types (items + tent configs) | Tasks 1, 2, 3 |
| No broken links after modal removal | Tasks 4, 5, 6 (removed all Link wrappers) |

### Type consistency check

- `AvailabilityCalendarPopover` props: `{ itemId?: number; configId?: number; name: string }` — used consistently in Tasks 4, 5, 6
- `getTentConfigDailyAvailability` return type: `{ date: string; available: number; total: number }[]` — matches `getItemDailyAvailability` shape, consumed correctly by the API route
- `TentConfigCard` props remain `{ config, avail, hasRange }` — signature unchanged from caller `TentsListing.tsx`

### Placeholder scan

No TBDs, TODOs, or "similar to" references. All code blocks are complete and specific.
