# Inventory Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Inventory view to the admin dashboard where admins can manage item and tent-part quantities, and employees can view quantities and tent configuration packing lists.

**Architecture:** New `/api/admin/inventory/*` routes (admin/employee auth-gated, PATCH admin-only) back a tab-based dashboard view. Pure math for buildable tent counts lives in `lib/availability.ts` (testable), DB-backed wrapper in `inventoryService.ts`. Six focused components (container, two tab views, three side sheets) keep each file under 250 lines.

**Tech Stack:** Next.js App Router · Prisma · next-auth v4 · shadcn/ui (Sheet, Tabs, Select, Switch) · Tailwind 4 · TypeScript

---

## File Map

**New files:**
```
src/app/api/admin/inventory/categories/route.ts
src/app/api/admin/inventory/items/route.ts
src/app/api/admin/inventory/items/[id]/route.ts
src/app/api/admin/inventory/tent-parts/route.ts
src/app/api/admin/inventory/tent-parts/[id]/route.ts
src/app/api/admin/inventory/tent-configurations/route.ts
src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx
src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-CategoryTab.tsx
src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx
src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx
src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentPartSheet.tsx
src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx
```

**Modified files:**
```
src/lib/availability.ts                                   ← add calcBuildableFromParts
src/lib/availability.test.ts                              ← add tests for calcBuildableFromParts
src/models/inventory.ts                                   ← add admin types
src/services/inventoryService.ts                          ← add getTentConfigBuildableCount
src/app/(app)/dashboard/Dashboard.tsx                     ← add inventory view case
src/app/(app)/dashboard/components/Dashboard-Sidebar.tsx  ← add Inventory link
src/components/shared/layout/Navbar-AccountPanel.tsx      ← add Inventory link
```

---

## Task 1: Pure Math — `calcBuildableFromParts`

**Files:**
- Modify: `src/lib/availability.ts`
- Modify: `src/lib/availability.test.ts`

- [ ] **Step 1: Write the failing tests**

Open `src/lib/availability.test.ts` and add at the end:

```ts
import { calcBuildableFromParts } from "./availability"

describe("calcBuildableFromParts", () => {
  it("returns 0 and null bottleneck for empty parts array", () => {
    expect(calcBuildableFromParts([])).toEqual({ canBuild: 0, bottleneck: null })
  })

  it("returns correct canBuild for a single part", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck).toBeNull() // single part — nothing else to be limited by
  })

  it("returns min across all parts and identifies the bottleneck", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },   // 5 max
      { tentPartId: 2, name: "Crown", stock: 12, qtyRequired: 1 },   // 12 max
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck?.name).toBe("Panel")
    expect(result.bottleneck?.maxFromThisPart).toBe(5)
  })

  it("returns null bottleneck when all parts are equally constraining", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },   // 5 max
      { tentPartId: 2, name: "Pole",  stock: 20, qtyRequired: 4 },   // 5 max
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck).toBeNull()
  })

  it("returns canBuild 0 when any part has zero stock", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 0,  qtyRequired: 4 },
      { tentPartId: 2, name: "Crown", stock: 12, qtyRequired: 1 },
    ])
    expect(result.canBuild).toBe(0)
    expect(result.bottleneck?.name).toBe("Panel")
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx jest src/lib/availability.test.ts --testNamePattern="calcBuildableFromParts" 2>/dev/null \
  || npx vitest run src/lib/availability.test.ts
```

Expected: all five new tests fail with "calcBuildableFromParts is not a function" or similar.

- [ ] **Step 3: Add `calcBuildableFromParts` to `src/lib/availability.ts`**

Add these exports at the end of the file (after the existing `buildConfigAvailability`):

```ts
// ----- Buildable count (physical stock only, no booking factor) ---------------

export type BuildablePart = {
  tentPartId: number
  name: string
  stock: number       // physical units owned (TentPart.qty or SerializedUnit count)
  qtyRequired: number // how many this part a single config needs
}

export type BuildableResult = {
  canBuild: number
  bottleneck: {
    tentPartId: number
    name: string
    stock: number
    qtyRequired: number
    maxFromThisPart: number
  } | null
}

/**
 * Derives how many tent configurations can be built from physical part stock.
 * No bookings, no date ranges — purely "how many do we own vs how many do we need".
 *
 * bottleneck is null when parts list is empty, has one part, or all parts are
 * equally constraining (nothing stands out as the limiting factor).
 */
export function calcBuildableFromParts(parts: BuildablePart[]): BuildableResult {
  if (parts.length === 0) return { canBuild: 0, bottleneck: null }

  const withMax = parts.map(p => ({
    ...p,
    maxFromThisPart: Math.floor(p.stock / p.qtyRequired),
  }))

  const canBuild = Math.min(...withMax.map(p => p.maxFromThisPart))

  // Only surface a bottleneck when one part clearly limits relative to others
  const allSame = withMax.every(p => p.maxFromThisPart === canBuild)
  const limiting = withMax.find(p => p.maxFromThisPart === canBuild)!

  return {
    canBuild,
    bottleneck: allSame ? null : limiting,
  }
}
```

- [ ] **Step 4: Run the tests — verify they pass**

```bash
npx jest src/lib/availability.test.ts 2>/dev/null \
  || npx vitest run src/lib/availability.test.ts
```

Expected: all tests pass (including pre-existing ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/availability.ts src/lib/availability.test.ts
git commit -m "feat: add calcBuildableFromParts pure math + tests"
```

---

## Task 2: Admin Type Definitions

**Files:**
- Modify: `src/models/inventory.ts`

- [ ] **Step 1: Add admin types to the end of `src/models/inventory.ts`**

```ts
// -----------------------------------------------------------------------------
// Admin inventory management types
// -----------------------------------------------------------------------------

export type AdminCategorySummary = {
  id: number
  slug: string
  name: string
  sortOrder: number
}

export type AdminItemSummary = {
  id: number
  sku: string
  slug: string
  name: string
  qty: number | null
  isActive: boolean
  primaryImageUrl: string | null
  sortOrder: number
}

export type AdminTentPartSummary = {
  id: number
  name: string
  partType: PartType
  qty: number | null
  isSerialized: boolean
  isActive: boolean
}

export type AdminTentConfigSummary = {
  id: number
  name: string
  widthFt: number
  lengthFt: number
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

- [ ] **Step 2: Commit**

```bash
git add src/models/inventory.ts
git commit -m "feat: add admin inventory type definitions"
```

---

## Task 3: Service Function — `getTentConfigBuildableCount`

**Files:**
- Modify: `src/services/inventoryService.ts`

- [ ] **Step 1: Add the import and function at the end of `src/services/inventoryService.ts`**

Add to the existing imports at the top:

```ts
import {
  buildAvailability,
  buildConfigAvailability,
  maxConcurrentBooked,
  calcBuildableFromParts,
  type AvailabilityShape,
  type BookingDemand,
  type ConfigAvailabilityShape,
  type PartSnapshot,
  type BuildablePart,
  type BuildableResult,
} from "@/lib/availability"
import type { AdminTentConfigSummary } from "@/models/inventory"
```

Then add this function at the end of the file:

```ts
// ---------------------------------------------------------------------------
// Physical buildable count — no booking factor, admin inventory view only
// ---------------------------------------------------------------------------

/**
 * How many of a tent configuration can be built from owned physical stock,
 * ignoring all bookings. Used exclusively by the admin Inventory view.
 *
 * Returns the full config shape needed by AdminTentConfigSummary.
 */
export async function getTentConfigBuildableCount(
  tentConfigId: number,
): Promise<Omit<AdminTentConfigSummary, "id" | "name" | "widthFt" | "lengthFt" | "isActive">> {
  const config = await prisma.tentConfiguration.findUnique({
    where: { id: tentConfigId },
    include: {
      bomParts: {
        include: {
          tentPart: {
            select: { id: true, name: true, partType: true, isSerialized: true, qty: true },
          },
        },
      },
    },
  })

  if (!config || !config.bomComplete || config.bomParts.length === 0) {
    return {
      bomComplete: config?.bomComplete ?? false,
      canBuild: 0,
      bottleneck: null,
      bomParts: [],
    }
  }

  const parts: BuildablePart[] = await Promise.all(
    config.bomParts.map(async (row) => {
      const stock = row.tentPart.isSerialized
        ? await prisma.serializedUnit.count({ where: { tentPartId: row.tentPartId, status: "available" } })
        : (row.tentPart.qty ?? 0)
      return {
        tentPartId: row.tentPartId,
        name: row.tentPart.name,
        stock,
        qtyRequired: row.qtyRequired,
      }
    }),
  )

  const { canBuild, bottleneck } = calcBuildableFromParts(parts)

  return {
    bomComplete: true,
    canBuild,
    bottleneck,
    bomParts: config.bomParts.map(row => ({
      tentPartId: row.tentPartId,
      name: row.tentPart.name,
      partType: row.tentPart.partType,
      qtyRequired: row.qtyRequired,
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new function.

- [ ] **Step 3: Commit**

```bash
git add src/services/inventoryService.ts
git commit -m "feat: add getTentConfigBuildableCount service function"
```

---

## Task 4: API — GET Categories

**Files:**
- Create: `src/app/api/admin/inventory/categories/route.ts`

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ data: categories, error: null })
}
```

- [ ] **Step 2: Smoke-test the route**

Start the dev server (`npm run dev`) and in a separate terminal:

```bash
curl -s http://localhost:3000/api/admin/inventory/categories | jq .
```

Expected when not logged in: `{"data":null,"error":"Unauthorized"}` with status 401.

Log in as admin in the browser, then grab the cookie and retry — or test after navigation is wired in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inventory/categories/route.ts
git commit -m "feat: GET /api/admin/inventory/categories"
```

---

## Task 5: API — Items (GET + PATCH)

**Files:**
- Create: `src/app/api/admin/inventory/items/route.ts`
- Create: `src/app/api/admin/inventory/items/[id]/route.ts`

- [ ] **Step 1: Create the GET route**

`src/app/api/admin/inventory/items/route.ts`:

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
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ data: items, error: null })
}
```

- [ ] **Step 2: Create the PATCH route**

`src/app/api/admin/inventory/items/[id]/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
  const { qty, isActive, primaryImageUrl } = body

  if (qty !== undefined && (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0)) {
    return NextResponse.json({ data: null, error: "qty must be a non-negative integer" }, { status: 400 })
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...(qty !== undefined ? { qty } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(primaryImageUrl !== undefined ? { primaryImageUrl: primaryImageUrl || null } : {}),
      updatedBy: session.user.email ?? undefined,
    },
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true },
  })

  return NextResponse.json({ data: item, error: null })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inventory/items/route.ts \
        "src/app/api/admin/inventory/items/[id]/route.ts"
git commit -m "feat: GET + PATCH /api/admin/inventory/items"
```

---

## Task 6: API — Tent Parts (GET + PATCH)

**Files:**
- Create: `src/app/api/admin/inventory/tent-parts/route.ts`
- Create: `src/app/api/admin/inventory/tent-parts/[id]/route.ts`

- [ ] **Step 1: Create the GET route**

`src/app/api/admin/inventory/tent-parts/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  // Tent parts are admin-only per spec (employees see configs but not the parts table)
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const parts = await prisma.tentPart.findMany({
    select: { id: true, name: true, partType: true, qty: true, isSerialized: true, isActive: true },
    orderBy: [{ partType: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ data: parts, error: null })
}
```

- [ ] **Step 2: Create the PATCH route**

`src/app/api/admin/inventory/tent-parts/[id]/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
  const { qty } = body

  if (qty === undefined || typeof qty !== "number" || !Number.isInteger(qty) || qty < 0) {
    return NextResponse.json({ data: null, error: "qty must be a non-negative integer" }, { status: 400 })
  }

  const part = await prisma.tentPart.update({
    where: { id },
    data: { qty },
    select: { id: true, name: true, partType: true, qty: true, isSerialized: true, isActive: true },
  })

  return NextResponse.json({ data: part, error: null })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inventory/tent-parts/route.ts \
        "src/app/api/admin/inventory/tent-parts/[id]/route.ts"
git commit -m "feat: GET + PATCH /api/admin/inventory/tent-parts"
```

---

## Task 7: API — Tent Configurations (GET with buildable count)

**Files:**
- Create: `src/app/api/admin/inventory/tent-configurations/route.ts`

- [ ] **Step 1: Create the route**

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
    select: { id: true, name: true, widthFt: true, lengthFt: true, isActive: true, bomComplete: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  const data = await Promise.all(
    configs.map(async (config) => {
      const buildable = await getTentConfigBuildableCount(config.id)
      return { ...config, ...buildable }
    }),
  )

  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/inventory/tent-configurations/route.ts
git commit -m "feat: GET /api/admin/inventory/tent-configurations with buildable count"
```

---

## Task 8: Navigation Wiring

**Files:**
- Modify: `src/app/(app)/dashboard/components/Dashboard-Sidebar.tsx`
- Modify: `src/components/shared/layout/Navbar-AccountPanel.tsx`
- Modify: `src/app/(app)/dashboard/Dashboard.tsx`

- [ ] **Step 1: Add Inventory link to the sidebar**

In `Dashboard-Sidebar.tsx`, add the `Package` import and the new link. The Inventory link sits between the Orders group and the admin-only divider — visible to both admin and employee.

Replace the import line:
```ts
import { LayoutGrid, Calendar, CheckCircle, Archive, BarChart2, Users, Settings } from "lucide-react"
```
With:
```ts
import { LayoutGrid, Calendar, CheckCircle, Archive, BarChart2, Users, Settings, Package } from "lucide-react"
```

In the JSX, add the Inventory link after the Archive SubLink and before the `{isAdmin ? (` block:

```tsx
<SubLink href="?view=archive" label="Archive" icon={<Archive size={14} />} active={view === "archive"} />

<SidebarLink href="?view=inventory" label="Inventory" icon={<Package size={16} />} active={view === "inventory"} />

{isAdmin ? (
```

- [ ] **Step 2: Add Inventory link to the account panel**

In `Navbar-AccountPanel.tsx`, add the `Package` import:

```ts
import { Eye, EyeOff, LayoutGrid, BarChart2, Users, Settings, UserCog, LogOut, Package } from "lucide-react"
```

Inside the `{isStaff ? (` block, after the Archive SubItem and before the `{role === "admin" ? (` check:

```tsx
<PanelSubItem onClick={() => navigate("/dashboard?view=archive")}>Archive</PanelSubItem>
<PanelItem icon={<Package className="h-4 w-4" />} onClick={() => navigate("/dashboard?view=inventory")}>Inventory</PanelItem>
{role === "admin" ? (
```

- [ ] **Step 3: Add inventory case to Dashboard.tsx**

Add the import at the top of `Dashboard.tsx`:

```ts
import DashboardInventoryView from "./components/views/Dashboard-InventoryView"
```

In `renderView()`, add the inventory case before the final `return` (the kanban fallback):

```ts
if (view === "inventory" && (role === "admin" || role === "employee")) {
  return <DashboardInventoryView role={role} />
}
```

Note: `DashboardInventoryView` doesn't exist yet (Task 14). This will cause a TypeScript error until Task 14 — that's fine, build tasks sequentially.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/components/Dashboard-Sidebar.tsx \
        src/components/shared/layout/Navbar-AccountPanel.tsx \
        src/app/(app)/dashboard/Dashboard.tsx
git commit -m "feat: add Inventory navigation to sidebar and account panel"
```

---

## Task 9: Tent Config Sheet (Packing List — both roles, read-only)

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  role: string
}

export default function DashboardInventoryViewTentConfigSheet({ config, open, onOpenChange, role }: Props) {
  const isAdmin = role === "admin"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Packing List</SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="mt-4 space-y-5 px-1">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">{config.widthFt}×{config.lengthFt} ft</p>
            </div>

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
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx
git commit -m "feat: tent config packing list sheet (read-only, both roles)"
```

---

## Task 10: Item Edit Sheet (admin only)

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx`

- [ ] **Step 1: Create the component**

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
import type { AdminItemSummary } from "@/models/inventory"

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
  const [isPending, startTransition] = useTransition()

  // Sync fields when item changes
  useEffect(() => {
    if (item) {
      setQty(item.qty !== null ? String(item.qty) : "")
      setIsActive(item.isActive)
      setImageUrl(item.primaryImageUrl ?? "")
    }
  }, [item])

  function handleSave() {
    if (!item) return
    const parsed = parseInt(qty, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: parsed, isActive, primaryImageUrl: imageUrl || null }),
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

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx
git commit -m "feat: item qty/active/image edit sheet"
```

---

## Task 11: Tent Part Edit Sheet (admin only)

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentPartSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { AdminTentPartSummary } from "@/models/inventory"

type Props = {
  part: AdminTentPartSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentPartSummary) => void
}

export default function DashboardInventoryViewTentPartSheet({ part, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (part) setQty(part.qty !== null ? String(part.qty) : "")
  }, [part])

  function handleSave() {
    if (!part) return
    const parsed = parseInt(qty, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: parsed }),
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
          <SheetTitle className="text-(--color-foreground)">Edit Tent Part</SheetTitle>
        </SheetHeader>

        {part ? (
          <div className="flex-1 space-y-4 mt-4 px-1">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Part Name</Label>
              <p className="text-sm text-(--color-foreground) rounded-md bg-(--color-surface) px-3 py-2">{part.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Type</Label>
              <p className="text-sm capitalize text-(--color-muted) rounded-md bg-(--color-surface) px-3 py-2">{part.partType}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-part-qty" className="text-xs uppercase tracking-wide text-(--color-muted)">Qty Owned</Label>
              <Input
                id="inv-part-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Physical units in your possession</p>
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !part} className="w-full gap-2">
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

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentPartSheet.tsx
git commit -m "feat: tent part qty edit sheet"
```

---

## Task 12: Category Tab Component

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-CategoryTab.tsx`

- [ ] **Step 1: Create the component**

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
          <table className="w-full text-sm border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-(--color-surface) border-b border-(--color-border)">
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">SKU</th>
                <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Qty Owned</th>
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

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-CategoryTab.tsx
git commit -m "feat: inventory category tab with item table"
```

---

## Task 13: Tents Tab Component

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import DashboardInventoryViewTentPartSheet from "./Dashboard-InventoryView-TentPartSheet"
import DashboardInventoryViewTentConfigSheet from "./Dashboard-InventoryView-TentConfigSheet"
import type { AdminTentPartSummary, AdminTentConfigSummary } from "@/models/inventory"

type Props = { role: string }

export default function DashboardInventoryViewTentsTab({ role }: Props) {
  const [parts, setParts] = useState<AdminTentPartSummary[]>([])
  const [configs, setConfigs] = useState<AdminTentConfigSummary[]>([])
  const [loading, setLoading] = useState(true)
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

  function handlePartSaved(updated: AdminTentPartSummary) {
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>

  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* Tent Parts — admin only */}
      {isAdmin ? (
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

      {/* Tent Configurations */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-(--color-foreground)">Tent Configurations</h3>
          <p className="text-xs text-(--color-muted)">
            {isAdmin ? "Derived from parts above — click for packing list" : "Click a row to see the packing list"}
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
                  <tr><td colSpan={isAdmin ? 4 : 2} className="px-4 py-4 text-center text-(--color-muted)">No configurations found.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
        role={role}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx
git commit -m "feat: tents tab with parts (admin) and config packing list (both roles)"
```

---

## Task 14: Inventory View Container + Final Wiring

**Files:**
- Create: `src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx`

- [ ] **Step 1: Create the container**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DashboardInventoryViewCategoryTab from "./inventory/Dashboard-InventoryView-CategoryTab"
import DashboardInventoryViewTentsTab from "./inventory/Dashboard-InventoryView-TentsTab"
import type { AdminCategorySummary } from "@/models/inventory"

type Props = { role: string }

export default function DashboardInventoryView({ role }: Props) {
  const [categories, setCategories] = useState<AdminCategorySummary[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/inventory/categories")
      .then(r => r.json())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data)
          setActiveTab(data[0].slug)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading inventory…</div>
  if (categories.length === 0) return <div className="p-6 text-sm text-(--color-muted)">No categories found.</div>

  function renderTabContent(slug: string, id: number) {
    if (slug === "tent") return <DashboardInventoryViewTentsTab role={role} />
    return <DashboardInventoryViewCategoryTab categoryId={id} role={role} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 border-b border-(--color-border)">
        <h2 className="text-lg font-semibold text-(--color-foreground) mb-3">Inventory</h2>

        {/* Mobile: select dropdown */}
        <div className="block md:hidden mb-3">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-(--color-background)">
              {categories.map(cat => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: tab strip */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-0 rounded-none">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat.slug}
                  value={cat.slug}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--color-primary) data-[state=active]:text-(--color-primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-2 px-3"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab content — driven by activeTab state (shared between select + tabs) */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(cat => (
          <div key={cat.slug} className={activeTab === cat.slug ? "block" : "hidden"}>
            {renderTabContent(cat.slug, cat.id)}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the app builds**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npm run build 2>&1 | tail -30
```

Expected: build succeeds with no TypeScript errors. If there are import errors, verify the path `./inventory/Dashboard-InventoryView-CategoryTab` matches the actual file created in earlier tasks.

- [ ] **Step 3: Manual smoke test**

1. Start dev server: `npm run dev`
2. Log in as admin → open account dropdown → confirm "Inventory" link appears
3. Click Inventory → confirm it navigates to `?view=inventory`
4. Confirm tab strip shows all categories
5. Click a non-tent category tab → confirm items table loads
6. Click a row (admin) → confirm side sheet opens with qty/active/image fields
7. Change qty → Save → confirm row updates in the table
8. Click the Tents tab → confirm "Tent Parts" section appears (admin only)
9. Click a tent part row → confirm part edit sheet opens
10. Click a tent config row → confirm packing list sheet opens
11. Log out → log in as employee → confirm Inventory is visible
12. Confirm employee sees read-only table (no pointer cursor, no sheet on row click for items)
13. Confirm employee Tents tab shows configs only (no Tent Parts section)
14. Confirm employee can click tent config to see packing list
15. On mobile viewport → confirm tab strip replaced by select dropdown

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx
git commit -m "feat: inventory view container with responsive tab/select navigation"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| `?view=inventory` view in dashboard | Task 14 |
| Sidebar + account dropdown navigation | Task 8 |
| Tabs per category (desktop) | Task 14 |
| Select dropdown on mobile | Task 14 |
| Tents tab for tent slug | Task 14 (`renderTabContent`) |
| Item qty/active/image editing (admin) | Tasks 5, 10, 12 |
| Tent part qty editing (admin) | Tasks 6, 11, 13 |
| Tent config buildable count (derived) | Tasks 1, 3, 7 |
| Bottleneck column (admin Tents tab) | Task 13 |
| BOM complete badge (admin Tents tab) | Task 13 |
| Packing list sheet (both roles) | Tasks 9, 13 |
| Bottleneck callout in packing list (admin only) | Task 9 |
| Employee sees configs, not parts | Task 13 |
| Employee read-only for all categories | Task 12 |
| PATCH routes admin-only (403 for employee) | Tasks 5, 6 |
| Row updates in-place after save (no refetch) | Tasks 10, 11, 12 |
| `calcBuildableFromParts` pure math + tests | Task 1 |
| `getTentConfigBuildableCount` service function | Task 3 |
| New `/api/admin/inventory/*` routes (not extending public) | Tasks 4–7 |
| Auth guard on all routes | Tasks 4–7 |

All spec requirements covered. ✓
