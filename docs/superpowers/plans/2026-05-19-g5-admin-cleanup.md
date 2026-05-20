# G5: Admin Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the `LineItemPreset` feature from the admin UI, update the dashboard to show the new inventory-linked order model, and clean up any dead code left from the quoting-template origin. `SetupFeePreset` is kept intact — only `LineItemPreset` is removed.

**Architecture:** Surgical removal of `LineItemPreset` only — delete the line-item-presets API route, the `LineItemPreset` type from `preset.ts`, and the dashboard settings component for it. The `SetupFeePreset` API, its dashboard settings view, and the setup cost selector in `GetQuote-Form` are untouched. Update the admin quote builder to use the new `Item` lookup flow instead of line item presets. No schema changes (`LineItemPreset` table was already removed in G1; `SetupFeePreset` table stays).

**Tech Stack:** Next.js App Router · Prisma · existing shadcn/ui components

**Prerequisite:** G2 AND G3 complete. G3 moves `dashboard/`, `get-quote/`, and `quote-builder/` into `src/app/(app)/` — G5 modifies files at those post-G3 paths. G4 does NOT need to be complete.

---

## File Map

**Delete entirely:**
- `src/app/api/line-item-presets/` — line item preset CRUD API (SetupFeePreset API stays)
- `src/app/(app)/dashboard/components/views/Dashboard-SettingsView-LineItemPresets.tsx` (SetupFeePresets view stays)

**Modify:**
- `src/models/preset.ts` — remove `LineItemPreset` type only; keep `SetupFeePreset`
- `src/app/(app)/get-quote/components/GetQuote-AddItemDialog.tsx` — replace preset dropdown with inventory item search
- `src/app/(app)/get-quote/components/GetQuote-Form.tsx` — remove lineItemPreset state/fetching only; setup fee preset state/fetching stays untouched
- `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx` — remove LineItemPresets import/JSX only; SetupFeePresets import/JSX stays
- `src/app/(app)/quote-builder/` — same update as get-quote if it references presets (check first)
- `src/app/(app)/dashboard/` — ensure order cards show `itemId`/`tentConfigId` fields if present
- `src/app/api/orders/route.ts` — verify preset logic is gone (handled in G2's extended POST, but confirm)

**Verify (read, don't change if clean):**
- `src/app/api/orders/[id]/route.ts` — should reference `orderLineItems` not preset fields
- `src/components/shared/` — check for any preset imports

---

## Task 1: Audit what references presets

**Files:**
- Read: `src/models/preset.ts`
- Bash: grep for preset references

- [ ] **Step 1: Find all preset references**

```bash
grep -rn "preset\|Preset\|lineItemPreset\|setupFee" \
  src/app src/components src/services src/models src/hooks \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules" \
  | grep -v "\.md:"
```

Expected output: a list of files that import or reference preset types. Record which files need editing. This is your deletion checklist.

- [ ] **Step 2: Read src/models/preset.ts**

Read the file to understand what types are exported. You will be removing all imports of these types from other files.

- [ ] **Step 3: Verify the DB schema has no LineItemPreset table (SetupFeePreset should remain)**

```bash
grep -n "LineItemPreset\|SetupFeePreset" prisma/schema.prisma
```

Expected: only `SetupFeePreset` appears (G1 already removed `LineItemPreset`). If `LineItemPreset` still appears, STOP — do not proceed without schema confirmation from Trevor.

---

## Task 2: Delete line-item-presets API route

`SetupFeePreset` API at `src/app/api/setup-fee-presets/` stays — do not touch it.

**Files:**
- Delete: `src/app/api/line-item-presets/` (entire directory)

- [ ] **Step 1: Confirm directory contents before deleting**

```bash
ls src/app/api/line-item-presets/
```

Expected: `route.ts` file (possibly with `[id]/` subdirectory).

- [ ] **Step 2: Delete the directory**

```bash
rm -rf src/app/api/line-item-presets
```

- [ ] **Step 3: Verify deletion**

```bash
ls src/app/api/
```

Expected: `line-item-presets` no longer appears. `setup-fee-presets` should still be present.

---

## Task 3: Delete preset model file and remove all imports

**Files:**
- Delete: `src/models/preset.ts`
- Modify: any file that imports from `@/models/preset`

- [ ] **Step 1: Find all imports of preset model**

```bash
grep -rn "from.*models/preset\|from.*preset" src/ --include="*.ts" --include="*.tsx"
```

Record every file in the output.

- [ ] **Step 2: Delete the LineItemPresets dashboard view component**

`Dashboard-SettingsView-SetupFeePresets.tsx` stays — only the line item preset view is deleted:

```bash
rm src/app/\(app\)/dashboard/components/views/Dashboard-SettingsView-LineItemPresets.tsx
```

Then open `src/app/(app)/dashboard/components/views/Dashboard-SettingsView.tsx` and remove **only**:
1. `import DashboardSettingsViewLineItemPresets from "./Dashboard-SettingsView-LineItemPresets"`
2. `<DashboardSettingsViewLineItemPresets />` from the JSX

Leave the `DashboardSettingsViewSetupFeePresets` import and JSX exactly as-is.

- [ ] **Step 3: Remove LineItemPreset from remaining files**

For each remaining file from Step 1 (excluding `GetQuote-AddItemDialog.tsx` and `GetQuote-Form.tsx`), open it and:
- Remove `LineItemPreset` from `import { LineItemPreset, ... } from "@/models/preset"` (keep `SetupFeePreset` if also imported)
- Remove any usage of the `LineItemPreset` type

Skip `GetQuote-AddItemDialog.tsx` and `GetQuote-Form.tsx` — those are handled in Task 4.

- [ ] **Step 4: Edit src/models/preset.ts — remove LineItemPreset type only**

Open `src/models/preset.ts` and delete the `LineItemPreset` type block. Leave `SetupFeePreset` exactly as-is. The file should end up containing only:

```typescript
export type SetupFeePreset = {
  id: number
  name: string
  description: string | null
  unitLabel: string
  defaultRate: number
  defaultCost: number
  sortOrder: number
  isActive: boolean
}
```

Do NOT delete the file — it still exports `SetupFeePreset`.

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: errors only for `LineItemPreset` references in `GetQuote-AddItemDialog.tsx` and `GetQuote-Form.tsx` (we'll fix those in Task 4). No other errors.

---

## Task 4: Remove preset UI from the admin quote builder

**Files:**
- Modify: `src/app/(app)/get-quote/` — container and child components
- Modify: `src/app/(app)/quote-builder/` — if it references presets

The admin quote builder currently adds line items by selecting from `LineItemPreset` records. Replace this with a simple item search against `GET /api/inventory/items`.

- [ ] **Step 1: Read the current get-quote files**

```bash
cat -n src/app/\(app\)/get-quote/components/GetQuote-AddItemDialog.tsx
cat -n src/app/\(app\)/get-quote/components/GetQuote-Form.tsx
```

The actual container is `GetQuote-Form.tsx` (not `GetQuote.tsx`). Understand:
- `GetQuote-AddItemDialog.tsx` — the dialog that currently uses `presets: LineItemPreset[]` to populate a Select; this file will be fully replaced in Step 3
- `GetQuote-Form.tsx` — fetches presets in a `useEffect` (lines ~73–74), holds preset state, and passes `presets={lineItemPresets}` to the dialog; Step 4 updates this file

- [ ] **Step 2: (No action)** Step 2 is absorbed into Steps 3 and 4 below.

- [ ] **Step 3: Rewrite GetQuote-AddItemDialog.tsx with inventory item search**

The `GET /api/inventory/items` route from G2 does NOT support a `?search=` param — it only supports `?categoryId=&from=&to=`. Fetch all items once on mount and filter client-side.

Replace `src/app/(app)/get-quote/components/GetQuote-AddItemDialog.tsx` entirely:

```tsx
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

export type AddItemResult = {
  itemId: number | null
  description: string
  qty: number
  unitPrice: number
  unitCost: number
  isCustom: boolean
}

type InventoryItem = { id: number; name: string; flatPrice: number }

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  isAdmin: boolean
  onAdd: (item: AddItemResult) => void
}

export default function GetQuoteAddItemDialog({ open, onOpenChange, isAdmin, onAdd }: Props) {
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [qty, setQty] = useState(1)
  const [customDescription, setCustomDescription] = useState("")
  const [customPrice, setCustomPrice] = useState(0)
  const [customCost, setCustomCost] = useState(0)
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then(({ data }) => { if (data) setAllItems(data) })
      .finally(() => setLoading(false))
  }, [open])

  const filtered = search.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems

  function reset() {
    setSearch("")
    setSelected(null)
    setQty(1)
    setCustomDescription("")
    setCustomPrice(0)
    setCustomCost(0)
    setIsCustom(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function handleAdd() {
    if (isCustom) {
      if (!customDescription.trim()) return
      onAdd({ itemId: null, description: customDescription, qty, unitPrice: customPrice, unitCost: customCost, isCustom: true })
    } else {
      if (!selected) return
      onAdd({ itemId: selected.id, description: selected.name, qty, unitPrice: Number(selected.flatPrice), unitCost: 0, isCustom: false })
    }
    reset()
    onOpenChange(false)
  }

  const canAdd = isCustom ? !!customDescription.trim() : !!selected

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-(--color-background)">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Search inventory</Label>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIsCustom(false); setSelected(null) }}
              placeholder="Type to filter items…"
              className="text-base"
              autoFocus
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-(--color-muted)" /></div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-(--color-border) rounded-md divide-y divide-(--color-border)">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelected(item); setIsCustom(false) }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center gap-3 hover:bg-(--color-surface) transition-colors ${selected?.id === item.id ? "bg-(--color-surface) font-medium" : ""}`}
                >
                  <span>{item.name}</span>
                  <span className="text-(--color-muted) shrink-0">${Number(item.flatPrice).toFixed(0)}/day</span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-(--color-muted)">No items match "{search}"</div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-item"
              checked={isCustom}
              onChange={(e) => { setIsCustom(e.target.checked); setSelected(null) }}
            />
            <label htmlFor="custom-item" className="text-sm text-(--color-muted) cursor-pointer">Custom item (not in inventory)</label>
          </div>

          {isCustom ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe the custom item" className="text-base" />
              </div>
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Price</Label>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))} className="text-base" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost</Label>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} value={customCost}
                      onChange={(e) => setCustomCost(Number(e.target.value))} className="text-base" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {(selected || isCustom) ? (
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" inputMode="numeric" min={1} value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="text-base" />
            </div>
          ) : null}
        </div>
        <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button autoFocus onClick={handleAdd} disabled={!canAdd}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Update GetQuote-Form.tsx to use the new AddItemDialog**

Open `src/app/(app)/get-quote/components/GetQuote-Form.tsx`. Make these **targeted** edits — touch only the LineItemPreset-related code; leave the setup fee preset code exactly as-is:

1. Change `import type { LineItemPreset, SetupFeePreset } from "@/models/preset"` → `import type { SetupFeePreset } from "@/models/preset"` (remove `LineItemPreset` from the import only)
2. Remove the `lineItemPresets` state variable (e.g. `const [lineItemPresets, setLineItemPresets] = useState<LineItemPreset[]>([])`) — line ~45
3. Remove the `fetch("/api/line-item-presets")` call from the `useEffect` — line ~73 (leave the `fetch("/api/setup-fee-presets")` call intact)
4. Remove the `presets={lineItemPresets}` prop from `<GetQuoteAddItemDialog ... />` (the `presets` prop no longer exists in the new dialog)
5. The `AddItemResult` type's `presetId` field is now `itemId` — update `FormLineItem` if it spreads `AddItemResult`, and update the `lineItems` mapping that builds the order body (replace any `presetId` reference with `itemId`)

**Do NOT touch** the `setupFeePresets` state, the `fetch("/api/setup-fee-presets")` call, or the setup fee selector JSX — that feature is unchanged.

After edits:
```bash
npx tsc --noEmit
```
Expected: no errors related to preset types.

- [ ] **Step 5: Verify the quote builder still creates orders**

Open `http://localhost:3000/get-quote` (logged in as admin). Confirm:
- No preset selector visible
- Item search input is present and filters inventory items
- Adding an item creates a line
- Submitting creates an order (check the network tab for a 201 response from POST /api/orders)

- [ ] **Step 6: Repeat for quote-builder if it also uses presets**

```bash
grep -n "preset\|Preset" src/app/\(app\)/quote-builder/ -r
```

If matches found, apply the same cleanup. If no matches, skip.

---

## Task 5: Update admin dashboard for new order model

**Files:**
- Modify: `src/app/(app)/dashboard/` — order cards / line item display

Admin orders now have `orderLineItems` with optional `itemId` / `tentConfigId`. The dashboard kanban and order detail should display item names if available.

- [ ] **Step 1: Read the dashboard order card component**

Find the component that renders individual order line items in the admin view (check `src/app/(app)/dashboard/` for files named like `OrderCard`, `OrderDetail`, or `LineItems`).

- [ ] **Step 2: Update line item display**

If a line item has `itemId`, show the item name. If it has `tentConfigId`, show the config name. The `orderLineItem` Prisma query in the admin API should include:

```typescript
orderLineItems: {
  include: {
    item: { select: { id: true, name: true, slug: true } },
    tentConfig: { select: { id: true, name: true, slug: true } },
  }
}
```

Update the admin order API route (e.g., `GET /api/orders/[id]`) to include these relations if not already present.

- [ ] **Step 3: In the line item display JSX**

```tsx
// For each line item
const displayName = line.item?.name ?? line.tentConfig?.name ?? line.description ?? "Item"
const detailLink = line.item?.slug
  ? `/shop/${line.item.slug}`
  : line.tentConfig?.slug
  ? `/shop/${line.tentConfig.slug}`
  : null
```

Show `displayName` and, if `detailLink` is set, make it a link so admin can jump to the public shop page for that item.

- [ ] **Step 4: Verify admin order view**

Open `http://localhost:3000/dashboard` as admin. Click an order. Confirm line items show item/config names.

---

## Task 6: Clean up dead code

- [ ] **Step 1: Search for any remaining LineItemPreset references**

```bash
grep -rn "LineItemPreset\|lineItemPreset\|line-item-preset\|line_item_preset" \
  src/ --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules"
```

Expected: no output. SetupFeePreset references are expected and correct — ignore them.

- [ ] **Step 2: Check for unused imports in modified files**

For each file modified in Tasks 3–5, check that no unused imports remain. TypeScript will flag them as errors if `noUnusedLocals` is enabled.

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Remove any preset-related env vars from .env.example**

```bash
grep -n "PRESET\|preset" .env.example
```

If found, remove those lines from `.env.example`.

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: build succeeds with 0 errors.

- [ ] **Step 5: Commit (reminder — Trevor commits)**

Per project rules, do NOT run `git add` or `git commit`. Flag to Trevor that G5 is ready to commit.

---

## Self-review Checklist

**Spec coverage:**
- ✅ LineItemPreset API route deleted (`line-item-presets/`)
- ✅ SetupFeePreset API route kept intact (`setup-fee-presets/`)
- ✅ `src/models/preset.ts` edited — `LineItemPreset` type removed, `SetupFeePreset` type kept
- ✅ Admin quote builder uses item search instead of preset selector
- ✅ Admin dashboard order cards show item/config names from new inventory model
- ✅ TypeScript clean (0 errors)
- ✅ Production build passes

**Gaps:**
- If `GET /api/inventory/items` doesn't support `search` param (depends on G2 implementation), the item search in the admin builder filters client-side from a full list. This is acceptable for admin use where item counts are small.
- The contact form on `/contact` (G4) doesn't wire up to a real email send — that's a future enhancement outside this plan's scope.
- BOM editor for tent configurations is explicitly out of scope per MASTER.md.
