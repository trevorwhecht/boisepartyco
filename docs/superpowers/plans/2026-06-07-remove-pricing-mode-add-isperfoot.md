# Remove pricingMode / Add isPerFoot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead `pricingMode` string enum on `InventoryItem` with a clean `isPerFoot` boolean, then wire it into the quote builder so lighting items show "ft" instead of "qty" and "$/ft" instead of "$/day."

**Architecture:** Schema migration drops the old column and adds a boolean; all API routes and the TypeScript model are updated in lockstep; the Edit Item panel gets a simple toggle; the quote builder's inventory picker and line-items table read `isPerFoot` off the fetched item and carry it through the `DraftLineItem` so the UI labels update automatically.

**Tech Stack:** Next.js App Router · Prisma 6 · TypeScript · React 19 · shadcn/ui · Tailwind 4

---

## File Map

| File | Change |
|---|---|
| `prisma/schema.prisma` | Remove `pricingMode`, add `isPerFoot Boolean @default(false)` |
| `src/models/inventory.ts` | Remove `PricingMode` type; swap field on `ItemSummary` and `AdminItemSummary` |
| `src/app/api/admin/inventory/items/route.ts` | Swap `pricingMode` → `isPerFoot` in select |
| `src/app/api/admin/inventory/items/[id]/route.ts` | Remove validation constant; swap field in select + PATCH handler |
| `src/app/api/inventory/items/route.ts` | Swap `pricingMode` → `isPerFoot` in select |
| `src/app/api/inventory/items/[slug]/route.ts` | Swap `pricingMode` → `isPerFoot` in select |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx` | Replace `pricingMode` dropdown with `isPerFoot` Switch |
| `src/app/(app)/quote-builder/QuoteBuilder.tsx` | Add `isPerFoot?: boolean` to `DraftLineItem`; pass it through `toDraftLineItem` |
| `src/app/(app)/quote-builder/components/QuoteBuilder-OrderItems.tsx` | Add `isPerFoot` to local `InventoryItem` type; update picker labels; update table |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma` (line 289)

- [ ] **Step 1: Edit schema.prisma**

Find and replace the `pricingMode` field on the `InventoryItem` model. The model block is around line 275–310.

Change:
```prisma
  pricingMode     String    @default("per_day")
```
To:
```prisma
  isPerFoot       Boolean   @default(false)
```

- [ ] **Step 2: Create and apply the migration**

```bash
npx prisma migrate dev --name remove_pricing_mode_add_is_per_foot
```

Expected output ends with: `Your database is now in sync with your schema.`

> ⚠️ **This touches the production DB if run against `.env.prod`.** Confirm you are pointed at the local dev database (`DATABASE_URL` in `.env.local`) before running.

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` line with no errors.

---

## Task 2: Update TypeScript Models

**Files:**
- Modify: `src/models/inventory.ts`

- [ ] **Step 1: Remove `PricingMode` and update `ItemSummary`**

Current (lines 14, 43):
```ts
export type PricingMode = "per_day" | "per_foot" | "per_event"
// ...
  pricingMode: PricingMode
```

Replace the entire `PricingMode` type declaration (line 14) — delete it entirely.

Then on `ItemSummary` (around line 43), change:
```ts
  pricingMode: PricingMode
```
To:
```ts
  isPerFoot: boolean
```

- [ ] **Step 2: Update `AdminItemSummary`**

Around line 193, change:
```ts
  pricingMode: PricingMode
```
To:
```ts
  isPerFoot: boolean
```

- [ ] **Step 3: Run type check — expect errors (that's the point)**

```bash
npx tsc --noEmit 2>&1 | grep "pricingMode\|PricingMode"
```

Expected: errors in the API routes and UI files that still reference the old field. This confirms the type system will catch every place that needs updating.

---

## Task 3: Update Admin Inventory API Routes

**Files:**
- Modify: `src/app/api/admin/inventory/items/route.ts`
- Modify: `src/app/api/admin/inventory/items/[id]/route.ts`

- [ ] **Step 1: Update the list route select**

In `src/app/api/admin/inventory/items/route.ts`, line 22, change the select object:
```ts
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, pricingMode: true },
```
To:
```ts
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, isPerFoot: true },
```

- [ ] **Step 2: Update the `[id]` route**

In `src/app/api/admin/inventory/items/[id]/route.ts`, replace the entire file contents with:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ITEM_SELECT = { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, isPerFoot: true } as const

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid id" }, { status: 400 })

  const item = await prisma.item.findUnique({ where: { id }, select: ITEM_SELECT })
  if (!item) return NextResponse.json({ data: null, error: "Not found" }, { status: 404 })

  return NextResponse.json({ data: { ...item, flatPrice: item.flatPrice.toNumber() }, error: null })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const { qty, isActive, primaryImageUrl, flatPrice, isPerFoot } = body

  if (qty !== undefined && (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0)) {
    return NextResponse.json({ data: null, error: "qty must be a non-negative integer" }, { status: 400 })
  }

  if (flatPrice !== undefined) {
    if (typeof flatPrice !== "number" || isNaN(flatPrice) || flatPrice < 0) {
      return NextResponse.json({ data: null, error: "flatPrice must be a non-negative number" }, { status: 400 })
    }
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...(qty !== undefined ? { qty } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(primaryImageUrl !== undefined ? { primaryImageUrl: primaryImageUrl || null } : {}),
      ...(flatPrice !== undefined ? { flatPrice } : {}),
      ...(isPerFoot !== undefined ? { isPerFoot } : {}),
    },
    select: ITEM_SELECT,
  })

  return NextResponse.json({ data: { ...item, flatPrice: item.flatPrice.toNumber() }, error: null })
}
```

---

## Task 4: Update Public Inventory API Routes

**Files:**
- Modify: `src/app/api/inventory/items/route.ts`
- Modify: `src/app/api/inventory/items/[slug]/route.ts`

- [ ] **Step 1: Update the public items list select**

In `src/app/api/inventory/items/route.ts`, in the `select` object (around line 20–38), change:
```ts
      pricingMode: true,
```
To:
```ts
      isPerFoot: true,
```

- [ ] **Step 2: Update the single item (slug) route select**

In `src/app/api/inventory/items/[slug]/route.ts`, in the select object (around line 43), change:
```ts
      capacity: true, pricingMode: true, pricingNote: true,
```
To:
```ts
      capacity: true, isPerFoot: true, pricingNote: true,
```

---

## Task 5: Update the Edit Item Panel UI

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx`

- [ ] **Step 1: Remove `PricingMode` import and state; add `isPerFoot` state**

Current import line 11:
```ts
import type { AdminItemSummary, PricingMode } from "@/models/inventory"
```
Change to:
```ts
import type { AdminItemSummary } from "@/models/inventory"
```

Current state declaration (line 27):
```ts
  const [pricingMode, setPricingMode] = useState<PricingMode>("per_day")
```
Replace with:
```ts
  const [isPerFoot, setIsPerFoot] = useState(false)
```

- [ ] **Step 2: Update the `useEffect` that populates form state**

Current (line 37):
```ts
      setPricingMode(item.pricingMode)
```
Replace with:
```ts
      setIsPerFoot(item.isPerFoot)
```

- [ ] **Step 3: Update the PATCH body in `handleSave`**

Current (line 70):
```ts
          pricingMode,
```
Replace with:
```ts
          isPerFoot,
```

- [ ] **Step 4: Replace the dropdown with a Switch toggle**

Remove the entire "Pricing Mode" section (lines 128–140):
```tsx
            <div className="space-y-1">
              <Label htmlFor="inv-item-pricing-mode" className="text-xs uppercase tracking-wide text-(--color-muted)">Pricing Mode</Label>
              <select
                id="inv-item-pricing-mode"
                value={pricingMode}
                onChange={e => setPricingMode(e.target.value as PricingMode)}
                className="w-full h-10 rounded-md border border-(--color-border) bg-(--color-background) px-3 text-base text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              >
                <option value="per_day">Per Day</option>
                <option value="per_foot">Per Foot</option>
                <option value="per_event">Per Event</option>
              </select>
            </div>
```

Replace with:
```tsx
            <div className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-3">
              <div>
                <Label htmlFor="inv-item-per-foot" className="text-sm text-(--color-foreground) cursor-pointer">Priced Per Foot</Label>
                <p className="text-xs text-(--color-muted)">For lighting — quantity entered as feet</p>
              </div>
              <Switch
                id="inv-item-per-foot"
                checked={isPerFoot}
                onCheckedChange={setIsPerFoot}
              />
            </div>
```

---

## Task 6: Wire `isPerFoot` into the Quote Builder

**Files:**
- Modify: `src/app/(app)/quote-builder/QuoteBuilder.tsx`
- Modify: `src/app/(app)/quote-builder/components/QuoteBuilder-OrderItems.tsx`

- [ ] **Step 1: Add `isPerFoot` to `DraftLineItem` in `QuoteBuilder.tsx`**

Current (lines 20–26):
```ts
export type DraftLineItem = {
  localId: string
  description: string
  qty: number
  unitPrice: number
  unitCost: number
}
```
Replace with:
```ts
export type DraftLineItem = {
  localId: string
  description: string
  qty: number
  unitPrice: number
  unitCost: number
  isPerFoot?: boolean
}
```

- [ ] **Step 2: Update `toDraftLineItem` to preserve the flag when loading saved orders**

Current (lines 46–48):
```ts
function toDraftLineItem(li: OrderDetail["orderLineItems"][0]): DraftLineItem {
  return { localId: String(li.id), description: li.description, qty: li.qty, unitPrice: li.unitPrice, unitCost: li.unitCost }
}
```

`OrderLineItem` doesn't store `isPerFoot`, so we leave `isPerFoot` absent (undefined) for items loaded from the DB — they are already saved and their labels don't need to change. No change needed here.

- [ ] **Step 3: Update the local `InventoryItem` type in `QuoteBuilder-OrderItems.tsx`**

Current (line 20):
```ts
type InventoryItem = { id: number; name: string; flatPrice: number }
```
Replace with:
```ts
type InventoryItem = { id: number; name: string; flatPrice: number; isPerFoot: boolean }
```

- [ ] **Step 4: Update the inventory picker list — show `$/ft` vs `$/day`**

Current (line 245):
```tsx
                    <span className="text-(--color-muted) shrink-0">${Number(item.flatPrice).toFixed(0)}/day</span>
```
Replace with:
```tsx
                    <span className="text-(--color-muted) shrink-0">${Number(item.flatPrice).toFixed(0)}{item.isPerFoot ? "/ft" : "/day"}</span>
```

- [ ] **Step 5: Update the qty input label in the picker — show "Feet" vs "Qty"**

Current (lines 254–258):
```tsx
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input type="number" inputMode="numeric" min={1} value={inventoryQty}
                  onChange={(e) => setInventoryQty(Math.max(1, Number(e.target.value)))} className="text-base" />
              </div>
```
Replace with:
```tsx
              <div className="space-y-1.5">
                <Label>{inventorySelected?.isPerFoot ? "Feet" : "Qty"}</Label>
                <Input type="number" inputMode="numeric" min={1} value={inventoryQty}
                  onChange={(e) => setInventoryQty(Math.max(1, Number(e.target.value)))} className="text-base" />
              </div>
```

- [ ] **Step 6: Pass `isPerFoot` when adding item to draft line items**

Current `addFromInventory` function (lines 60–71):
```ts
  function addFromInventory() {
    if (!inventorySelected) return
    onChange([...items, {
      localId: newLocalId(),
      description: inventorySelected.name,
      qty: inventoryQty,
      unitPrice: Number(inventorySelected.flatPrice),
      unitCost: 0,
    }])
    resetInventoryDialog()
    setShowInventoryDialog(false)
  }
```
Replace with:
```ts
  function addFromInventory() {
    if (!inventorySelected) return
    onChange([...items, {
      localId: newLocalId(),
      description: inventorySelected.name,
      qty: inventoryQty,
      unitPrice: Number(inventorySelected.flatPrice),
      unitCost: 0,
      isPerFoot: inventorySelected.isPerFoot,
    }])
    resetInventoryDialog()
    setShowInventoryDialog(false)
  }
```

- [ ] **Step 7: Show "ft" suffix in the line items table qty column**

In the table body, the qty cell for editable rows (around line 147–157):
```tsx
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <Input
                      type="number" inputMode="numeric" min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(item.localId, "qty", Math.max(1, Number(e.target.value)))}
                      className="text-base h-8 w-16 text-right"
                    />
                  ) : (
                    <span>{item.qty}</span>
                  )}
                </td>
```
Replace with:
```tsx
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input
                        type="number" inputMode="numeric" min={1}
                        value={item.qty}
                        onChange={(e) => updateItem(item.localId, "qty", Math.max(1, Number(e.target.value)))}
                        className="text-base h-8 w-16 text-right"
                      />
                      {item.isPerFoot ? <span className="text-xs text-(--color-muted)">ft</span> : null}
                    </div>
                  ) : (
                    <span>{item.qty}{item.isPerFoot ? <span className="text-xs text-(--color-muted) ml-0.5">ft</span> : null}</span>
                  )}
                </td>
```

Also update the totals row qty cell (around line 205) to remove `isPerFoot` concerns — total feet displayed is fine as a plain number, no change needed there.

---

## Task 7: Type Check and Verify

- [ ] **Step 1: Run full type check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any remaining references to `pricingMode` or `PricingMode` that appear.

- [ ] **Step 2: Start dev server and manually verify**

```bash
npm run dev
```

Check these three flows in the browser:

1. **Edit Item panel** — open any item in the Inventory dashboard view. Confirm the "Priced Per Foot" toggle appears instead of the Pricing Mode dropdown. Toggle it on for a lighting item and save — confirm it persists on re-open.

2. **Quote Builder inventory picker** — open a quote, click "Add from Inventory." Confirm lighting items (with `isPerFoot = true`) show `$/ft` and non-lighting items show `$/day`. Select a lighting item and confirm the qty label reads "Feet."

3. **Quote Builder line items table** — after adding a per-foot item, confirm a small "ft" label appears next to its qty in the table.

- [ ] **Step 3: Run migration against production DB**

Once verified locally:
```bash
npm run dev:prod  # briefly — just to confirm the migration file is correct
npx prisma migrate deploy  # applies pending migrations to prod DB
```

> ⚠️ Run `migrate deploy` (not `migrate dev`) against production. `migrate deploy` applies existing migration files without creating new ones.
