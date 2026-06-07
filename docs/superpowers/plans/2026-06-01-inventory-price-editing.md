# Inventory Price Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to edit `flatPrice` and `pricingMode` on regular inventory items via the Edit Item sheet, and edit `flatPrice` on tent configurations via the Tent Config sheet, with the Tents tab converted to a tab-toggle layout (Parts vs. Configurations).

**Architecture:** Extend the `AdminItemSummary` and `AdminTentConfigSummary` types to include price fields, update the relevant GET/PATCH API routes, add price inputs to both edit sheets, and replace the dual-section Tents tab with a segmented tab control. No schema changes — `flatPrice`, `pricingMode`, and `cost` already exist in `schema.prisma`.

**Tech Stack:** Next.js App Router · Prisma · NextAuth · Tailwind 4 · shadcn/ui (Sheet, Label, Input, Button, Badge)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/models/inventory.ts` | Modify | Add `flatPrice`/`pricingMode` to `AdminItemSummary`; add `flatPrice` to `AdminTentConfigSummary` |
| `src/app/api/admin/inventory/items/route.ts` | Modify | Include `flatPrice`/`pricingMode` in GET select |
| `src/app/api/admin/inventory/items/[id]/route.ts` | Modify | Accept/validate `flatPrice`/`pricingMode` in PATCH; return them in response |
| `src/app/api/admin/inventory/tent-configurations/route.ts` | Modify | Include `flatPrice` in GET select |
| `src/app/api/admin/inventory/tent-configurations/[id]/route.ts` | **Create** | Admin-only PATCH for `flatPrice`/`isActive` on tent configurations |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx` | Modify | Add `flatPrice` + `pricingMode` state, inputs, and include in PATCH body |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-CategoryTab.tsx` | Modify | Add Price column to items table |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx` | Modify | Add `flatPrice` editing, Save/Cancel footer, `onSaved` prop |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx` | Modify | Replace dual-section layout with tab toggle (Parts / Configurations); wire `handleConfigSaved` |

---

## Task 1: Extend `AdminItemSummary` and `AdminTentConfigSummary` types

**Files:**
- Modify: `src/models/inventory.ts`

- [ ] **Step 1: Update AdminItemSummary to include price fields**

In `src/models/inventory.ts`, replace the `AdminItemSummary` type (currently lines 183–192):

```ts
export type AdminItemSummary = {
  id: number
  sku: string
  slug: string
  name: string
  qty: number | null
  isActive: boolean
  primaryImageUrl: string | null
  sortOrder: number
  flatPrice: number
  pricingMode: PricingMode
}
```

- [ ] **Step 2: Update AdminTentConfigSummary to include flatPrice**

In `src/models/inventory.ts`, replace `AdminTentConfigSummary` (currently lines 203–224):

```ts
export type AdminTentConfigSummary = {
  id: number
  name: string
  widthFt: number
  lengthFt: number
  flatPrice: number
  isActive: boolean
  bomComplete: boolean
  canBuild: number
  bottleneck: {
    tentPartId: number
    name: string
    stock: number
    qtyRequired: number
    maxFromThisPart: number
  } | null
  bomParts: {
    tentPartId: number
    name: string
    partType: string
    qtyRequired: number
  }[]
}
```

- [ ] **Step 3: Run type check to catch any callers that now have missing fields**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | head -60
```

Expected: errors about missing `flatPrice`/`pricingMode` in the API routes and UI that we haven't updated yet — that's fine. No *unexpected* errors.

---

## Task 2: Update admin items GET route to return price fields

**Files:**
- Modify: `src/app/api/admin/inventory/items/route.ts`

- [ ] **Step 1: Add flatPrice and pricingMode to the Prisma select**

Replace the entire file content:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  if (!categoryId) return NextResponse.json({ data: null, error: "categoryId is required" }, { status: 400 })

  const id = parseInt(categoryId, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid categoryId" }, { status: 400 })

  const items = await prisma.item.findMany({
    where: { categoryId: id },
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, pricingMode: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({
    data: items.map(item => ({ ...item, flatPrice: item.flatPrice.toNumber() })),
    error: null,
  })
}
```

---

## Task 3: Update item PATCH route to accept and save price fields

**Files:**
- Modify: `src/app/api/admin/inventory/items/[id]/route.ts`

- [ ] **Step 1: Replace the PATCH handler to accept flatPrice and pricingMode**

Replace the entire file:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const VALID_PRICING_MODES = ["per_day", "per_foot", "per_event"]

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
  const { qty, isActive, primaryImageUrl, flatPrice, pricingMode } = body

  if (qty !== undefined && (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0)) {
    return NextResponse.json({ data: null, error: "qty must be a non-negative integer" }, { status: 400 })
  }

  if (flatPrice !== undefined) {
    if (typeof flatPrice !== "number" || isNaN(flatPrice) || flatPrice < 0) {
      return NextResponse.json({ data: null, error: "flatPrice must be a non-negative number" }, { status: 400 })
    }
  }

  if (pricingMode !== undefined && !VALID_PRICING_MODES.includes(pricingMode)) {
    return NextResponse.json({ data: null, error: "Invalid pricingMode" }, { status: 400 })
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...(qty !== undefined ? { qty } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(primaryImageUrl !== undefined ? { primaryImageUrl: primaryImageUrl || null } : {}),
      ...(flatPrice !== undefined ? { flatPrice } : {}),
      ...(pricingMode !== undefined ? { pricingMode } : {}),
    },
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, pricingMode: true },
  })

  return NextResponse.json({ data: { ...item, flatPrice: item.flatPrice.toNumber() }, error: null })
}
```

---

## Task 4: Update Item Sheet UI with price and pricingMode inputs

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx`

- [ ] **Step 1: Replace the entire file with price-editing support**

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { AdminItemSummary, PricingMode } from "@/models/inventory"

type Props = {
  item: AdminItemSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminItemSummary) => void
}

export default function DashboardInventoryViewItemSheet({ item, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState("")
  const [flatPrice, setFlatPrice] = useState("")
  const [pricingMode, setPricingMode] = useState<PricingMode>("per_day")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (item) {
      setQty(item.qty !== null ? String(item.qty) : "")
      setIsActive(item.isActive)
      setImageUrl(item.primaryImageUrl ?? "")
      setFlatPrice(String(item.flatPrice))
      setPricingMode(item.pricingMode)
    }
  }, [item])

  function handleSave() {
    if (!item) return

    const parsedQty = parseInt(qty, 10)
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }

    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (use 0 for 'call for pricing').")
      return
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: parsedQty,
          isActive,
          primaryImageUrl: imageUrl || null,
          flatPrice: parsedPrice,
          pricingMode,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        return
      }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Edit Item</SheetTitle>
        </SheetHeader>

        {item ? (
          <div className="flex-1 space-y-4 mt-4 px-1 overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Name</Label>
              <p className="text-sm text-(--color-foreground) rounded-md bg-(--color-surface) px-3 py-2">{item.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">SKU</Label>
              <p className="text-sm font-mono text-(--color-muted) rounded-md bg-(--color-surface) px-3 py-2">{item.sku}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-qty" className="text-xs uppercase tracking-wide text-(--color-muted)">Qty Owned</Label>
              <Input
                id="inv-item-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Physical units in your possession</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-price" className="text-xs uppercase tracking-wide text-(--color-muted)">Rental Price ($)</Label>
              <Input
                id="inv-item-price"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={flatPrice}
                onChange={e => setFlatPrice(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Set to 0 for "call for pricing"</p>
            </div>
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
            <div className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-3">
              <Label htmlFor="inv-item-active" className="text-sm text-(--color-foreground) cursor-pointer">Active</Label>
              <Switch
                id="inv-item-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-image" className="text-xs uppercase tracking-wide text-(--color-muted)">Primary Image URL</Label>
              <Input
                id="inv-item-image"
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="text-base"
              />
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !item} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

---

## Task 5: Add Price column to the items table in CategoryTab

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-CategoryTab.tsx`

- [ ] **Step 1: Add Price column to table header and rows**

Replace the entire file:

```tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import DashboardInventoryViewItemSheet from "./Dashboard-InventoryView-ItemSheet"
import type { AdminItemSummary } from "@/models/inventory"

type Props = { categoryId: number; role: string }

export default function DashboardInventoryViewCategoryTab({ categoryId, role }: Props) {
  const [items, setItems] = useState<AdminItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<AdminItemSummary | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isAdmin = role === "admin"

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/inventory/items?categoryId=${categoryId}`)
      .then(r => r.json())
      .then(({ data }) => { if (data) setItems(data) })
      .finally(() => setLoading(false))
  }, [categoryId])

  function handleRowClick(item: AdminItemSummary) {
    if (!isAdmin) return
    setSelectedItem(item)
    setSheetOpen(true)
  }

  function handleSaved(updated: AdminItemSummary) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  if (loading) {
    return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>
  }

  if (items.length === 0) {
    return <div className="p-6 text-sm text-(--color-muted)">No items in this category.</div>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="rounded-lg border border-(--color-border) overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-(--color-surface) border-b border-(--color-border)">
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">SKU</th>
                <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Qty Owned</th>
                <th className="text-right px-4 py-2.5 font-medium text-(--color-muted)">Price</th>
                <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  className={[
                    "border-b border-(--color-border) last:border-0 transition-colors",
                    isAdmin ? "cursor-pointer hover:bg-(--color-surface)" : "",
                    selectedItem?.id === item.id && sheetOpen ? "bg-(--color-surface)" : "",
                  ].join(" ")}
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-4 py-3 font-medium text-(--color-foreground)">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-(--color-muted)">{item.sku}</td>
                  <td className="px-4 py-3 text-center font-semibold text-(--color-foreground)">
                    {item.qty !== null ? item.qty : <span className="text-(--color-muted)">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-(--color-foreground)">
                    {item.flatPrice > 0 ? `$${item.flatPrice.toFixed(2)}` : <span className="text-(--color-muted)">Call</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isActive ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-(--color-muted) text-xs">Off</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin ? (
        <DashboardInventoryViewItemSheet
          item={selectedItem}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}
```

---

## Task 6: Update tent configurations GET route to return flatPrice

**Files:**
- Modify: `src/app/api/admin/inventory/tent-configurations/route.ts`

- [ ] **Step 1: Add flatPrice to the Prisma select and serialize it**

Replace the entire file:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigBuildableCount } from "@/services/inventoryService"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const configs = await prisma.tentConfiguration.findMany({
    select: { id: true, name: true, widthFt: true, lengthFt: true, flatPrice: true, isActive: true, bomComplete: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  const data = await Promise.all(
    configs.map(async (config) => {
      const buildable = await getTentConfigBuildableCount(config.id)
      return { ...config, flatPrice: config.flatPrice.toNumber(), ...buildable }
    }),
  )

  return NextResponse.json({ data, error: null })
}
```

---

## Task 7: Create tent configuration PATCH route

**Files:**
- Create: `src/app/api/admin/inventory/tent-configurations/[id]/route.ts`

- [ ] **Step 1: Create the new file**

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigBuildableCount } from "@/services/inventoryService"

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
  const { flatPrice, isActive } = body

  if (flatPrice !== undefined) {
    if (typeof flatPrice !== "number" || isNaN(flatPrice) || flatPrice < 0) {
      return NextResponse.json({ data: null, error: "flatPrice must be a non-negative number" }, { status: 400 })
    }
  }

  const config = await prisma.tentConfiguration.update({
    where: { id },
    data: {
      ...(flatPrice !== undefined ? { flatPrice } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: { id: true, name: true, widthFt: true, lengthFt: true, flatPrice: true, isActive: true, bomComplete: true, sortOrder: true },
  })

  const buildable = await getTentConfigBuildableCount(id)

  return NextResponse.json({
    data: { ...config, flatPrice: config.flatPrice.toNumber(), ...buildable },
    error: null,
  })
}
```

---

## Task 8: Update TentConfigSheet to support price editing

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx`

- [ ] **Step 1: Replace the file — add flatPrice input, save/cancel footer, onSaved prop**

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentConfigSummary) => void
  role: string
}

export default function DashboardInventoryViewTentConfigSheet({ config, open, onOpenChange, onSaved, role }: Props) {
  const isAdmin = role === "admin"
  const [flatPrice, setFlatPrice] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (config) setFlatPrice(String(config.flatPrice))
  }, [config])

  function handleSave() {
    if (!config) return
    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (use 0 for 'call for pricing').")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatPrice: parsedPrice }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">
            {isAdmin ? "Edit Configuration" : "Packing List"}
          </SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="flex-1 space-y-5 mt-4 px-1 overflow-y-auto">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">{config.widthFt}×{config.lengthFt} ft</p>
            </div>

            {isAdmin ? (
              <div className="space-y-1">
                <Label htmlFor="tent-config-price" className="text-xs uppercase tracking-wide text-(--color-muted)">Rental Price ($)</Label>
                <Input
                  id="tent-config-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={flatPrice}
                  onChange={e => setFlatPrice(e.target.value)}
                  className="text-base font-semibold"
                />
                <p className="text-xs text-(--color-muted)">Set to 0 for "call for pricing"</p>
              </div>
            ) : null}

            <div>
              <p className="text-xs uppercase tracking-wide text-(--color-muted) mb-2">Parts required × 1 tent</p>
              {config.bomParts.length === 0 ? (
                <p className="text-sm text-(--color-muted)">No parts defined yet.</p>
              ) : (
                <ul className="space-y-2">
                  {config.bomParts.map(part => (
                    <li
                      key={part.tentPartId}
                      className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-2 text-sm"
                    >
                      <span className="text-(--color-foreground)">{part.name}</span>
                      <span className="font-bold text-(--color-foreground)">× {part.qtyRequired}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isAdmin && config.bottleneck ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="font-semibold">Bottleneck:</span> {config.bottleneck.name} — need {config.bottleneck.qtyRequired} per tent,
                have {config.bottleneck.stock} → max {config.bottleneck.maxFromThisPart} tents
              </div>
            ) : null}

            {!isAdmin && (
              <p className="text-xs text-(--color-muted)">
                Contact an admin to update tent part quantities.
              </p>
            )}

            {!config.bomComplete && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ BOM incomplete
              </Badge>
            )}
          </div>
        ) : null}

        {isAdmin ? (
          <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button onClick={handleSave} disabled={isPending || !config} className="w-full gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
              Cancel
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
```

---

## Task 9: Convert TentsTab to tabbed layout (Parts / Configurations)

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx`

- [ ] **Step 1: Replace the file with tab toggle UI and wired onSaved for configs**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import DashboardInventoryViewTentPartSheet from "./Dashboard-InventoryView-TentPartSheet"
import DashboardInventoryViewTentConfigSheet from "./Dashboard-InventoryView-TentConfigSheet"
import type { AdminTentPartSummary, AdminTentConfigSummary } from "@/models/inventory"

type Tab = "parts" | "configs"

type Props = { role: string }

export default function DashboardInventoryViewTentsTab({ role }: Props) {
  const [parts, setParts] = useState<AdminTentPartSummary[]>([])
  const [configs, setConfigs] = useState<AdminTentConfigSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("parts")
  const [selectedPart, setSelectedPart] = useState<AdminTentPartSummary | null>(null)
  const [partSheetOpen, setPartSheetOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<AdminTentConfigSummary | null>(null)
  const [configSheetOpen, setConfigSheetOpen] = useState(false)
  const isAdmin = role === "admin"

  useEffect(() => {
    setLoading(true)
    const fetches = isAdmin
      ? [fetch("/api/admin/inventory/tent-parts").then(r => r.json()), fetch("/api/admin/inventory/tent-configurations").then(r => r.json())]
      : [Promise.resolve({ data: [] }), fetch("/api/admin/inventory/tent-configurations").then(r => r.json())]

    Promise.all(fetches).then(([partsJson, configsJson]) => {
      if (partsJson.data) setParts(partsJson.data)
      if (configsJson.data) setConfigs(configsJson.data)
      setLoading(false)
    })
  }, [isAdmin])

  function handlePartClick(part: AdminTentPartSummary) {
    setSelectedPart(part)
    setPartSheetOpen(true)
  }

  function handleConfigClick(config: AdminTentConfigSummary) {
    setSelectedConfig(config)
    setConfigSheetOpen(true)
  }

  async function handlePartSaved(updated: AdminTentPartSummary) {
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
    // Re-fetch configs so canBuild / bottleneck recalculates from new qty
    const res = await fetch("/api/admin/inventory/tent-configurations")
    const { data } = await res.json()
    if (data) setConfigs(data)
  }

  function handleConfigSaved(updated: AdminTentConfigSummary) {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Tab toggle — only show for admin (employees only see configs) */}
      {isAdmin ? (
        <div className="flex border border-(--color-border) rounded-lg overflow-hidden self-start w-fit">
          <button
            onClick={() => setActiveTab("parts")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "parts"
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-muted) hover:bg-(--color-surface)",
            ].join(" ")}
          >
            Tent Parts
          </button>
          <button
            onClick={() => setActiveTab("configs")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors border-l border-(--color-border)",
              activeTab === "configs"
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-muted) hover:bg-(--color-surface)",
            ].join(" ")}
          >
            Configurations
          </button>
        </div>
      ) : null}

      {/* Tent Parts — admin only, shown when parts tab is active */}
      {isAdmin && activeTab === "parts" ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-(--color-foreground)">Tent Parts</h3>
            <p className="text-xs text-(--color-muted)">Physical units you own — click a row to edit qty</p>
          </div>
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-(--color-surface) border-b border-(--color-border)">
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Part Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Type</th>
                    <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Qty Owned</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(part => (
                    <tr
                      key={part.id}
                      className={[
                        "border-b border-(--color-border) last:border-0 cursor-pointer transition-colors hover:bg-(--color-surface)",
                        selectedPart?.id === part.id && partSheetOpen ? "bg-(--color-surface)" : "",
                      ].join(" ")}
                      onClick={() => handlePartClick(part)}
                    >
                      <td className="px-4 py-3 font-medium text-(--color-foreground)">{part.name}</td>
                      <td className="px-4 py-3 capitalize text-(--color-muted)">{part.partType}</td>
                      <td className="px-4 py-3 text-center font-semibold text-(--color-foreground)">
                        {part.qty !== null ? part.qty : <span className="text-(--color-muted)">—</span>}
                      </td>
                    </tr>
                  ))}
                  {parts.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-(--color-muted)">No tent parts found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tent Configurations — shown when configs tab is active (or always for employees) */}
      {(!isAdmin || activeTab === "configs") ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-(--color-foreground)">Tent Configurations</h3>
            <p className="text-xs text-(--color-muted)">
              {isAdmin ? "Click a row to edit price and view packing list" : "Click a row to see the packing list"}
            </p>
          </div>
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-(--color-surface) border-b border-(--color-border)">
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Configuration</th>
                    <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Can Build</th>
                    {isAdmin ? (
                      <>
                        <th className="text-right px-4 py-2.5 font-medium text-(--color-muted)">Price</th>
                        <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Bottleneck</th>
                        <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">BOM</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {configs.map(config => (
                    <tr
                      key={config.id}
                      className={[
                        "border-b border-(--color-border) last:border-0 cursor-pointer transition-colors hover:bg-(--color-surface)",
                        selectedConfig?.id === config.id && configSheetOpen ? "bg-(--color-surface)" : "",
                      ].join(" ")}
                      onClick={() => handleConfigClick(config)}
                    >
                      <td className="px-4 py-3 font-medium text-(--color-foreground)">{config.name}</td>
                      <td className="px-4 py-3 text-center">
                        {config.bomComplete ? (
                          <span className={[
                            "font-bold",
                            config.canBuild > 0 ? "text-green-700" : "text-(--color-danger)",
                          ].join(" ")}>
                            {config.canBuild}
                          </span>
                        ) : (
                          <span className="text-(--color-muted)">—</span>
                        )}
                      </td>
                      {isAdmin ? (
                        <>
                          <td className="px-4 py-3 text-right font-semibold text-(--color-foreground)">
                            {config.flatPrice > 0 ? `$${config.flatPrice.toFixed(2)}` : <span className="text-(--color-muted)">Call</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-amber-700">
                            {config.bottleneck
                              ? `${config.bottleneck.name} — need ${config.bottleneck.qtyRequired}, have ${config.bottleneck.stock} → ${config.bottleneck.maxFromThisPart} max`
                              : <span className="text-(--color-muted)">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {config.bomComplete ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">✓ Complete</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">⚠ Incomplete</Badge>
                            )}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                  {configs.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 5 : 2} className="px-4 py-4 text-center text-(--color-muted)">No configurations found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <DashboardInventoryViewTentPartSheet
          part={selectedPart}
          open={partSheetOpen}
          onOpenChange={setPartSheetOpen}
          onSaved={handlePartSaved}
        />
      ) : null}

      <DashboardInventoryViewTentConfigSheet
        config={selectedConfig}
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        onSaved={handleConfigSaved}
        role={role}
      />
    </div>
  )
}
```

---

## Task 10: Verify — type check and manual smoke test

- [ ] **Step 1: Run TypeScript check — must pass clean**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard?view=inventory` and verify:

1. **Category tab (e.g. Chairs):** Table now shows a "Price" column with `$XX.XX` or "Call"
2. **Click a chair row:** Edit Item sheet opens with Rental Price and Pricing Mode fields pre-filled
3. **Change the price, save:** Sheet closes, table row updates to show new price without page reload
4. **Tents tab:** Tab toggle appears at the top — "Tent Parts" selected by default
5. **Click "Configurations" tab:** Switches to configurations table with a "Price" column
6. **Click a tent config row:** Sheet opens showing price input at the top + packing list below
7. **Change the price, save:** Sheet closes, configurations table row updates with new price

- [ ] **Step 3: Commit**

Stage only the 9 files touched in this plan and commit with a message like:

```
feat: admin price editing for inventory items and tent configurations
```
