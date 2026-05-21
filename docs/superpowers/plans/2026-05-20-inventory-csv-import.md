# Inventory CSV Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Download Template and Upload CSV buttons to the Inventory view header so admins can bulk-update item and tent part quantities via CSV.

**Architecture:** A pure CSV parse utility (`src/utils/csvInventory.ts`) handles all parsing logic and is unit-tested in isolation. Two new `POST` import routes (`/api/admin/inventory/items/import` and `/api/admin/inventory/tent-parts/import`) apply the parsed rows to the DB. The existing `Dashboard-InventoryView.tsx` gains two buttons (admin-only, top-right of header) that adapt to the active tab. Blank qty cells are skipped — no value is zeroed out.

**Tech Stack:** Next.js App Router · Prisma · next-auth v4 · shadcn/ui Button · Tailwind 4 · TypeScript · Vitest

---

## File Map

**New files:**
```
src/utils/csvInventory.ts                                      ← pure CSV parse utility
src/utils/csvInventory.test.ts                                 ← unit tests for the utility
src/app/api/admin/inventory/items/import/route.ts              ← POST bulk items update
src/app/api/admin/inventory/tent-parts/import/route.ts         ← POST bulk tent-parts update
```

**Modified files:**
```
src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx
  ↳ add download template + upload CSV buttons (admin-only, top-right header)
  ↳ add downloadTemplate(), handleUpload() functions
```

---

## Task 1: CSV Parse Utility + Tests

**Files:**
- Create: `src/utils/csvInventory.ts`
- Create: `src/utils/csvInventory.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/csvInventory.test.ts`:

```ts
import { parseInventoryCsv } from "./csvInventory"

describe("parseInventoryCsv — items", () => {
  it("returns headerError for wrong header", () => {
    const result = parseInventoryCsv("wrong,cols\n1,foo,SKU,5", "items")
    expect(result.headerError).toBeTruthy()
  })

  it("returns headerError for empty input", () => {
    const result = parseInventoryCsv("", "items")
    expect(result.headerError).toBeTruthy()
  })

  it("parses valid rows", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,10\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 1, qty: 10 }, { id: 2, qty: 5 }])
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it("skips rows with blank qty and counts them", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 2, qty: 5 }])
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it("skips whitespace-only qty and counts as skipped", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,   "
    const result = parseInventoryCsv(csv, "items")
    expect(result.skipped).toBe(1)
    expect(result.rows).toHaveLength(0)
  })

  it("collects row errors for invalid qty but still processes other rows", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,abc\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toEqual([{ id: 2, qty: 5 }])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Row 2")
  })

  it("errors on negative qty", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,-3"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Row 2")
  })

  it("handles names with commas using id=first col, qty=last col", () => {
    // "Chair, Folding" causes extra columns — qty is always the last col
    const csv = "id,name,sku,qty\n1,\"Chair, Folding\",CHR-01,25"
    // After simple split this produces: ["1", "\"Chair", " Folding\"", "CHR-01", "25"]
    // last col is "25", id is "1" — should parse correctly
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toEqual([{ id: 1, qty: 25 }])
  })
})

describe("parseInventoryCsv — tent-parts", () => {
  it("accepts tent-parts header", () => {
    const csv = "id,name,part_type,qty\n1,Panel,panel,40"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 1, qty: 40 }])
  })

  it("rejects items header when kind is tent-parts", () => {
    const csv = "id,name,sku,qty\n1,Panel,panel,40"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.headerError).toBeTruthy()
  })

  it("skips blank qty rows", () => {
    const csv = "id,name,part_type,qty\n1,Panel,panel,\n2,Crown,crown,12"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.rows).toEqual([{ id: 2, qty: 12 }])
    expect(result.skipped).toBe(1)
  })
})
```

- [ ] **Step 2: Run the tests — verify they fail**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx vitest run src/utils/csvInventory.test.ts 2>&1 | tail -20
```

Expected: all tests fail with "Cannot find module './csvInventory'" or similar.

- [ ] **Step 3: Create `src/utils/csvInventory.ts`**

```ts
// =============================================================================
// Pure CSV parsing utility for inventory bulk import.
// Uses id (first column) and qty (last column) — immune to commas in names.
// =============================================================================

export type CsvKind = "items" | "tent-parts"

export type ParsedCsvResult = {
  rows: { id: number; qty: number }[]
  skipped: number
  errors: string[]
  headerError: string | null
}

const EXPECTED_HEADERS: Record<CsvKind, string> = {
  "items": "id,name,sku,qty",
  "tent-parts": "id,name,part_type,qty",
}

/**
 * Parses a CSV string from an inventory template download.
 *
 * Rules:
 *  - Header row must match the expected format for `kind` exactly.
 *  - id = first column, qty = last column (handles names with commas).
 *  - Blank or whitespace-only qty → skip row (count as skipped, no error).
 *  - Invalid or negative qty → row error, row is excluded from results.
 *  - All valid rows are returned even if other rows have errors.
 */
export function parseInventoryCsv(csvText: string, kind: CsvKind): ParsedCsvResult {
  const lines = csvText.trim().split("\n").map(l => l.trim()).filter(l => l.length > 0)

  if (lines.length === 0) {
    return { rows: [], skipped: 0, errors: [], headerError: "CSV is empty" }
  }

  const header = lines[0].toLowerCase()
  if (header !== EXPECTED_HEADERS[kind]) {
    return {
      rows: [],
      skipped: 0,
      errors: [],
      headerError: `Unexpected CSV format. Expected header: ${EXPECTED_HEADERS[kind]}`,
    }
  }

  const rows: { id: number; qty: number }[] = []
  let skipped = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const cols = lines[i].split(",")
    if (cols.length < 2) continue

    const id = parseInt(cols[0].trim(), 10)
    const qtyRaw = cols[cols.length - 1].trim() // always last column

    // Blank qty = intentionally skipped
    if (qtyRaw === "") {
      skipped++
      continue
    }

    if (isNaN(id)) {
      errors.push(`Row ${rowNum}: invalid id "${cols[0].trim()}"`)
      continue
    }

    const qty = parseInt(qtyRaw, 10)
    if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      errors.push(`Row ${rowNum}: invalid qty "${qtyRaw}" — must be a non-negative whole number`)
      continue
    }

    rows.push({ id, qty })
  }

  return { rows, skipped, errors, headerError: null }
}
```

- [ ] **Step 4: Run the tests — verify they all pass**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx vitest run src/utils/csvInventory.test.ts 2>&1 | tail -20
```

Expected: all tests pass. If the "names with commas" test fails, verify the split logic uses `cols[cols.length - 1]` for qty.

- [ ] **Step 5: Verify TypeScript**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx tsc --noEmit 2>&1 | grep -i "csvInventory" | head -10
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/csvInventory.ts src/utils/csvInventory.test.ts
git commit -m "feat: add parseInventoryCsv pure utility + tests"
```

---

## Task 2: Items Bulk Import API Route

**Files:**
- Create: `src/app/api/admin/inventory/items/import/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "/Users/trevorhecht/Developer/repos/nextjs/boisepartyco/src/app/api/admin/inventory/items/import"
```

Create `src/app/api/admin/inventory/items/import/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const rows: { id: number; qty: number }[] = body.rows ?? []

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ data: null, error: "No rows to import" }, { status: 400 })
  }

  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      await prisma.item.update({ where: { id: row.id }, data: { qty: row.qty } })
      updated++
    } catch {
      errors.push(`id ${row.id}: not found or update failed`)
    }
  }

  return NextResponse.json({ data: { updated, errors }, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx tsc --noEmit 2>&1 | grep -i "items/import" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inventory/items/import/route.ts
git commit -m "feat: POST /api/admin/inventory/items/import bulk qty update"
```

---

## Task 3: Tent Parts Bulk Import API Route

**Files:**
- Create: `src/app/api/admin/inventory/tent-parts/import/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "/Users/trevorhecht/Developer/repos/nextjs/boisepartyco/src/app/api/admin/inventory/tent-parts/import"
```

Create `src/app/api/admin/inventory/tent-parts/import/route.ts`:

```ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const rows: { id: number; qty: number }[] = body.rows ?? []

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ data: null, error: "No rows to import" }, { status: 400 })
  }

  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      await prisma.tentPart.update({ where: { id: row.id }, data: { qty: row.qty } })
      updated++
    } catch {
      errors.push(`id ${row.id}: not found or update failed`)
    }
  }

  return NextResponse.json({ data: { updated, errors }, error: null })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx tsc --noEmit 2>&1 | grep -i "tent-parts/import" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/inventory/tent-parts/import/route.ts
git commit -m "feat: POST /api/admin/inventory/tent-parts/import bulk qty update"
```

---

## Task 4: UI — Download Template + Upload CSV Buttons

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

The current file is 86 lines. Replace it completely with:

```tsx
"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Download, Loader2, Upload } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import DashboardInventoryViewCategoryTab from "./inventory/Dashboard-InventoryView-CategoryTab"
import DashboardInventoryViewTentsTab from "./inventory/Dashboard-InventoryView-TentsTab"
import { parseInventoryCsv, type CsvKind } from "@/utils/csvInventory"
import type { AdminCategorySummary } from "@/models/inventory"

type Props = { role: string }

export default function DashboardInventoryView({ role }: Props) {
  const [categories, setCategories] = useState<AdminCategorySummary[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isUploading, startUploadTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = role === "admin"

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

  async function downloadTemplate() {
    const isTents = activeTab === "tent"
    const today = new Date().toISOString().slice(0, 10)

    if (isTents) {
      const res = await fetch("/api/admin/inventory/tent-parts")
      const { data, error } = await res.json()
      if (error || !data) { toast.error("Failed to fetch tent parts"); return }
      const csv = ["id,name,part_type,qty", ...data.map((p: any) => `${p.id},${p.name},${p.partType},${p.qty ?? ""}`)].join("\n")
      triggerDownload(csv, `inventory-tent-parts-${today}.csv`)
    } else {
      const activeCat = categories.find(c => c.slug === activeTab)
      if (!activeCat) return
      const res = await fetch(`/api/admin/inventory/items?categoryId=${activeCat.id}`)
      const { data, error } = await res.json()
      if (error || !data) { toast.error("Failed to fetch items"); return }
      const csv = ["id,name,sku,qty", ...data.map((item: any) => `${item.id},${item.name},${item.sku},${item.qty ?? ""}`)].join("\n")
      triggerDownload(csv, `inventory-${activeTab}-${today}.csv`)
    }
  }

  function triggerDownload(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = "" // reset so same file can be re-selected

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const kind: CsvKind = activeTab === "tent" ? "tent-parts" : "items"
      const parsed = parseInventoryCsv(text, kind)

      if (parsed.headerError) {
        toast.error(parsed.headerError)
        return
      }

      if (parsed.rows.length === 0 && parsed.errors.length === 0) {
        toast.error(`No rows to import — all qty fields are blank (${parsed.skipped} skipped)`)
        return
      }

      startUploadTransition(async () => {
        const endpoint = kind === "tent-parts"
          ? "/api/admin/inventory/tent-parts/import"
          : "/api/admin/inventory/items/import"

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: parsed.rows }),
        })
        const json = await res.json()

        if (json.error) { toast.error(json.error); return }

        const { updated, errors: serverErrors } = json.data
        const allErrors = [...parsed.errors, ...serverErrors]
        const summary: string[] = [`${updated} updated`]
        if (parsed.skipped > 0) summary.push(`${parsed.skipped} skipped`)

        if (allErrors.length > 0) {
          const preview = allErrors.slice(0, 3).join("; ") + (allErrors.length > 3 ? "…" : "")
          toast.error(`${summary.join(", ")}. Errors: ${preview}`)
        } else {
          toast.success(summary.join(", "))
        }
      })
    }
    reader.readAsText(file)
  }

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading inventory…</div>
  if (categories.length === 0) return <div className="p-6 text-sm text-(--color-muted)">No categories found.</div>

  function renderTabContent(slug: string, id: number) {
    if (slug === "tent") return <DashboardInventoryViewTentsTab role={role} />
    return <DashboardInventoryViewCategoryTab categoryId={id} role={role} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 border-b border-(--color-border)">

        {/* Header row: title + CSV buttons */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-(--color-foreground)">Inventory</h2>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-1.5 text-xs h-8"
              >
                <Download size={13} />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-1.5 text-xs h-8"
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          ) : null}
        </div>

        {/* Mobile: select dropdown */}
        <div className="block md:hidden mb-3">
          <Select value={activeTab} onValueChange={v => { if (v) setActiveTab(v) }}>
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

Note: The `TabsContent` import was unused in the original file — it has been removed.

- [ ] **Step 2: Verify TypeScript compiles clean**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx tsc --noEmit 2>&1 | head -20
```

Expected: no TypeScript errors (only the Node.js ESM warning is acceptable).

- [ ] **Step 3: Run all tests — verify nothing regressed**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco
npx vitest run 2>&1 | tail -15
```

Expected: all tests pass (includes the new csvInventory tests).

- [ ] **Step 4: Manual smoke test**

1. `npm run dev` in the project directory
2. Log in as admin → navigate to `?view=inventory`
3. **Download**: Click `↓ Template` on a category tab → a `.csv` file downloads, pre-filled with current items and their quantities
4. Switch to Tents tab → click `↓ Template` → tent-parts CSV downloads with `id,name,part_type,qty` header
5. **Upload — success path**: Edit a qty cell in the downloaded CSV, save, upload it → toast shows "N updated"
6. **Upload — blank skip**: Clear a qty cell, upload → toast shows "N updated, M skipped"
7. **Upload — wrong file**: Try uploading a tent-parts CSV while on an items tab → error toast about unexpected header
8. **Employee check**: Log in as employee → buttons should NOT appear in the header
9. **Mobile**: At narrow viewport → buttons still visible in the flex row alongside the title

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx
git commit -m "feat: add CSV download template + upload buttons to inventory header"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Download CSV template button (top-right, admin) | Task 4 |
| Upload CSV button (top-right, admin) | Task 4 |
| Adapts to active tab (items vs tent parts) | Task 4 — `activeTab === "tent"` branch |
| Template pre-filled with current data | Task 4 — `downloadTemplate()` fetches live data |
| Blank qty = skip, not zero | Task 1 — `parseInventoryCsv` skips blank, Task 4 — only sends non-blank rows |
| Success toast with count | Task 4 — `toast.success(...)` |
| Error toast with row details | Task 4 — `toast.error(...)` with `allErrors.slice(0,3)` |
| Partial errors don't block valid rows | Task 2 & 3 — per-row try/catch; Task 1 — continues on row error |
| Admin-only (403 for employee on upload) | Tasks 2 & 3 — route auth check; Task 4 — buttons hidden for non-admin |
| Header validation before upload | Task 1 — `parseInventoryCsv` checks header, Task 4 — aborts on `headerError` |
| Names with commas handled | Task 1 — uses `cols[cols.length - 1]` for qty |
| Items API route | Task 2 |
| Tent parts API route | Task 3 |
| Pure CSV utility testable in isolation | Task 1 |

All spec requirements covered. ✓
