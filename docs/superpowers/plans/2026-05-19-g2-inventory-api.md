# G2: Inventory API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all `/api/inventory/*` read routes and extend `POST /api/orders` to accept public shop quote submissions.

**Architecture:** Six public (no-auth) inventory routes backed by `inventoryService.ts` from G1, plus a new detection branch in the orders POST that handles the `CreateOrderPayload` shape from the shop cart. Inventory reads return `{ data, error }` tuples; cost fields are stripped for non-admin callers. Public quotes upsert a guest User so customer contact info is preserved for admin follow-up.

**Tech Stack:** Next.js App Router Route Handlers · Prisma · NextAuth v4 · TypeScript

**Prerequisite:** G1 complete — schema migrated, seed run, `src/lib/availability.ts`, `src/services/inventoryService.ts`, and `src/models/inventory.ts` all in place.

---

## File Map

**Create:**
- `src/app/api/inventory/categories/route.ts` — GET all active categories
- `src/app/api/inventory/items/route.ts` — GET items with optional `?categoryId=&from=&to=`
- `src/app/api/inventory/items/[slug]/route.ts` — GET item detail + spec + availability
- `src/app/api/inventory/tent-configurations/route.ts` — GET tent configs with availability
- `src/app/api/inventory/tent-configurations/[slug]/route.ts` — GET config detail + BOM + availability
- `src/app/api/inventory/availability/route.ts` — GET batch availability for cart validation

**Modify:**
- `src/app/api/orders/route.ts` — extend POST: detect `pickupDate` → route to public shop handler

---

### Task 1: Categories route

**Files:**
- Create: `src/app/api/inventory/categories/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/categories/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isSerialized: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json({ data: categories, error: null })
}
```

- [ ] **Step 2: Smoke test** (dev server must be running with `npm run dev`)

```bash
curl -s http://localhost:3000/api/inventory/categories | jq '.data | length'
```

Expected: a number ≥ 1 (seeded categories)

---

### Task 2: Items list route

**Files:**
- Create: `src/app/api/inventory/items/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/items/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBulkItemAvailability } from "@/services/inventoryService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const hasRange = !!(from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()))

  const items = await prisma.item.findMany({
    where: {
      isActive: true,
      ...(categoryId ? { categoryId: parseInt(categoryId, 10) } : {}),
    },
    select: {
      id: true,
      sku: true,
      slug: true,
      name: true,
      blurb: true,
      categoryId: true,
      category: { select: { slug: true, name: true } },
      subcategory: true,
      flatPrice: true,
      qty: true,
      size: true,
      capacity: true,
      pricingMode: true,
      pricingNote: true,
      sortOrder: true,
      isActive: true,
      primaryImageUrl: true,
    },
    orderBy: { sortOrder: "asc" },
  })

  let availMap: Map<number, any> | null = null
  if (hasRange) {
    availMap = await getBulkItemAvailability(
      items.map((i) => i.id),
      from!,
      to!,
    )
  }

  const data = items.map((item) => ({
    ...item,
    availability: hasRange ? (availMap!.get(item.id) ?? null) : null,
  }))

  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 2: Smoke test**

```bash
# All items
curl -s "http://localhost:3000/api/inventory/items" | jq '.data | length'

# Filter to category 1
curl -s "http://localhost:3000/api/inventory/items?categoryId=1" | jq '.data[0].name'

# With date-range availability
curl -s "http://localhost:3000/api/inventory/items?from=2026-06-01&to=2026-06-03" | jq '.data[0].availability'
```

Expected: item count, a name string, and an availability object with `stock`/`booked`/`available` keys.

---

### Task 3: Item detail route

**Files:**
- Create: `src/app/api/inventory/items/[slug]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/items/[slug]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import type { ItemDetail } from "@/models/inventory"

function extractSpec(item: any): ItemDetail["spec"] {
  if (item.tentSpec)       return { kind: "tent",       widthFt: item.tentSpec.widthFt, lengthFt: item.tentSpec.lengthFt, style: item.tentSpec.style }
  if (item.chairSpec)      return { kind: "chair",      material: item.chairSpec.material, color: item.chairSpec.color, hasArmrests: item.chairSpec.hasArmrests }
  if (item.tableSpec)      return { kind: "table",      shape: item.tableSpec.shape, widthIn: item.tableSpec.widthIn, lengthIn: item.tableSpec.lengthIn }
  if (item.linenSpec)      return { kind: "linen",      linType: item.linenSpec.linType, widthIn: item.linenSpec.widthIn, lengthIn: item.linenSpec.lengthIn }
  if (item.decorationSpec) return { kind: "decoration", decType: item.decorationSpec.decType, widthIn: item.decorationSpec.widthIn, heightIn: item.decorationSpec.heightIn }
  if (item.heaterSpec)     return { kind: "heater",     heaterType: item.heaterSpec.heaterType, fuelType: item.heaterSpec.fuelType, btu: item.heaterSpec.btu }
  if (item.floorSpec)      return { kind: "floor",      widthFt: item.floorSpec.widthFt, lengthFt: item.floorSpec.lengthFt, material: item.floorSpec.material }
  if (item.cateringSpec)   return { kind: "catering",   equipmentType: item.cateringSpec.equipmentType, capacityLiters: item.cateringSpec.capacityLiters, includesLid: item.cateringSpec.includesLid }
  if (item.lightingSpec)   return { kind: "lighting",   lightType: item.lightingSpec.lightType, pricePerFoot: item.lightingSpec.pricePerFoot, minFeet: item.lightingSpec.minFeet }
  return null
}

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const hasRange = !!(from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()))

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"

  const item = await prisma.item.findUnique({
    where: { slug: params.slug, isActive: true },
    select: {
      id: true, sku: true, slug: true, name: true, blurb: true, description: true, cost: true,
      categoryId: true,
      category: { select: { slug: true, name: true } },
      subcategory: true, flatPrice: true, qty: true, size: true,
      capacity: true, pricingMode: true, pricingNote: true,
      sortOrder: true, isActive: true, primaryImageUrl: true,
      images: {
        select: { id: true, url: true, alt: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      tentSpec:       { select: { widthFt: true, lengthFt: true, style: true } },
      chairSpec:      { select: { material: true, color: true, hasArmrests: true } },
      tableSpec:      { select: { shape: true, widthIn: true, lengthIn: true } },
      linenSpec:      { select: { linType: true, widthIn: true, lengthIn: true } },
      decorationSpec: { select: { decType: true, widthIn: true, heightIn: true } },
      heaterSpec:     { select: { heaterType: true, fuelType: true, btu: true } },
      floorSpec:      { select: { widthFt: true, lengthFt: true, material: true } },
      cateringSpec:   { select: { equipmentType: true, capacityLiters: true, includesLid: true } },
      lightingSpec:   { select: { lightType: true, pricePerFoot: true, minFeet: true } },
    },
  })

  if (!item) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 })
  }

  const spec = extractSpec(item)
  const availability = hasRange ? await getItemAvailability(item.id, from!, to!) : null

  const {
    tentSpec, chairSpec, tableSpec, linenSpec, decorationSpec,
    heaterSpec, floorSpec, cateringSpec, lightingSpec, cost, ...rest
  } = item

  return NextResponse.json({
    data: { ...rest, cost: isAdmin ? Number(cost) : 0, spec, availability },
    error: null,
  })
}
```

- [ ] **Step 2: Smoke test**

First find a slug from the seed output:
```bash
curl -s "http://localhost:3000/api/inventory/items" | jq '.data[0].slug'
```

Then test with that slug (e.g., `standard-folding-chair`):
```bash
curl -s "http://localhost:3000/api/inventory/items/standard-folding-chair" | jq '.data.spec'

curl -s "http://localhost:3000/api/inventory/items/standard-folding-chair?from=2026-06-01&to=2026-06-03" \
  | jq '.data | {spec, availability}'
```

Expected: spec object with a `kind` field (e.g., `"chair"`), availability object with `stock`/`booked`/`available` when dates provided. `cost` should be `0` (not logged in as admin).

---

### Task 4: Tent configurations list route

**Files:**
- Create: `src/app/api/inventory/tent-configurations/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/tent-configurations/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getBulkTentConfigAvailability } from "@/services/inventoryService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const hasRange = !!(from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()))

  const configs = await prisma.tentConfiguration.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      widthFt: true,
      lengthFt: true,
      flatPrice: true,
      blurb: true,
      capacity: true,
      sortOrder: true,
      isActive: true,
      bomComplete: true,
      primaryImageUrl: true,
    },
    orderBy: { sortOrder: "asc" },
  })

  let availMap: Map<number, any> | null = null
  if (hasRange) {
    availMap = await getBulkTentConfigAvailability(
      configs.map((c) => c.id),
      from!,
      to!,
    )
  }

  const data = configs.map((config) => ({
    ...config,
    availability: hasRange ? (availMap!.get(config.id) ?? null) : null,
  }))

  return NextResponse.json({ data, error: null })
}
```

- [ ] **Step 2: Smoke test**

```bash
curl -s "http://localhost:3000/api/inventory/tent-configurations" | jq '.data | length'

curl -s "http://localhost:3000/api/inventory/tent-configurations?from=2026-06-01&to=2026-06-03" \
  | jq '.data[0] | {name, availability}'
```

Expected: tent config count, and an availability object when dates provided.

---

### Task 5: Tent configuration detail route

**Files:**
- Create: `src/app/api/inventory/tent-configurations/[slug]/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/tent-configurations/[slug]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigAvailability } from "@/services/inventoryService"

export async function GET(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const hasRange = !!(from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()))

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"

  const config = await prisma.tentConfiguration.findUnique({
    where: { slug: params.slug, isActive: true },
    select: {
      id: true, slug: true, name: true, widthFt: true, lengthFt: true,
      flatPrice: true, blurb: true, capacity: true, description: true,
      cost: true, sortOrder: true, isActive: true, bomComplete: true,
      primaryImageUrl: true,
      bomParts: {
        select: {
          id: true,
          tentPartId: true,
          qtyRequired: true,
          tentPart: {
            select: { id: true, name: true, partType: true, isSerialized: true },
          },
        },
      },
    },
  })

  if (!config) {
    return NextResponse.json({ data: null, error: "Not found" }, { status: 404 })
  }

  const availability = hasRange ? await getTentConfigAvailability(config.id, from!, to!) : null

  const { cost, ...rest } = config

  return NextResponse.json({
    data: { ...rest, cost: isAdmin ? Number(cost) : 0, availability },
    error: null,
  })
}
```

- [ ] **Step 2: Smoke test**

Find a slug from the seed (e.g., `20x30-twin-peak`):
```bash
curl -s "http://localhost:3000/api/inventory/tent-configurations" | jq '.data[0].slug'
```

Then:
```bash
curl -s "http://localhost:3000/api/inventory/tent-configurations/20x30-twin-peak" \
  | jq '.data | {name, bomParts: (.bomParts | length)}'

curl -s "http://localhost:3000/api/inventory/tent-configurations/20x30-twin-peak?from=2026-06-01&to=2026-06-03" \
  | jq '.data.availability'
```

Expected: config with non-zero `bomParts` length, and availability object with dates.

---

### Task 6: Batch availability route

Used by the cart to validate all line items in one request before submitting the quote.

**Files:**
- Create: `src/app/api/inventory/availability/route.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/app/api/inventory/availability/route.ts
// GET ?itemIds=1,2,3&configIds=4,5&from=YYYY-MM-DD&to=YYYY-MM-DD
import { NextResponse } from "next/server"
import { getBulkItemAvailability, getBulkTentConfigAvailability } from "@/services/inventoryService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemIdsStr = searchParams.get("itemIds") ?? ""
  const configIdsStr = searchParams.get("configIds") ?? ""
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  if (!fromStr || !toStr) {
    return NextResponse.json({ data: null, error: "from and to are required" }, { status: 400 })
  }

  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ data: null, error: "Invalid date range" }, { status: 400 })
  }

  const itemIds = itemIdsStr
    ? itemIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []
  const configIds = configIdsStr
    ? configIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []

  const [itemAvailMap, configAvailMap] = await Promise.all([
    itemIds.length
      ? getBulkItemAvailability(itemIds, from, to)
      : Promise.resolve(new Map<number, any>()),
    configIds.length
      ? getBulkTentConfigAvailability(configIds, from, to)
      : Promise.resolve(new Map<number, any>()),
  ])

  return NextResponse.json({
    data: {
      items: Object.fromEntries(itemAvailMap),
      configs: Object.fromEntries(configAvailMap),
    },
    error: null,
  })
}
```

- [ ] **Step 2: Smoke test** (replace IDs with real ones from your seed)

```bash
curl -s "http://localhost:3000/api/inventory/availability?itemIds=1,2&configIds=1&from=2026-06-01&to=2026-06-03" \
  | jq '.data'
```

Expected:
```json
{
  "items": {
    "1": { "stock": 20, "booked": 0, "available": 20, "hasConflicts": false, "isLow": false },
    "2": { "stock": 10, "booked": 0, "available": 10, "hasConflicts": false, "isLow": false }
  },
  "configs": {
    "1": { "stock": 1, "booked": 0, "available": 1, "hasConflicts": false, "isLow": false, "bottleneckParts": [...], "bomComplete": true }
  }
}
```

---

### Task 7: Extend orders POST for public shop quotes

The existing `POST /api/orders` handles staff-created orders (with `lineItems` array, `userId`, etc.). This task adds a detection branch at the top of the POST that routes to a new helper when the body contains `pickupDate`.

**Files:**
- Modify: `src/app/api/orders/route.ts`

- [ ] **Step 1: Read the current file**

```bash
cat -n src/app/api/orders/route.ts
```

Note the current structure: `GET` handler → `generateToken` function → `POST` handler. In the current POST, `const session` is declared first (line 36), then `role`/`isStaff`/`isPublic` (lines 37–39), then `const body = await req.json()` (line 41). You need to move `body` up before the role checks so the detection branch can read it.

Also note: `computeOrderTotals` is **already imported** on line 5 (`import { serializeOrder, stripAdminFields, computeOrderTotals } from "@/services/orderService"`). Do NOT add a duplicate import for it.

- [ ] **Step 2: Add the import and helper, then wire into POST**

Add `validateOrderLines` to the inventoryService import at the top of the file:

```typescript
import { validateOrderLines } from "@/services/inventoryService"
```

Add this helper function **before** the `export async function POST` declaration:

```typescript
async function handlePublicShopQuote(body: any): Promise<Response> {
  const { pickupDate, dropoffDate, customer, lines, customerNotes } = body

  if (!pickupDate || !dropoffDate) {
    return NextResponse.json({ data: null, error: "pickupDate and dropoffDate are required" }, { status: 400 })
  }
  if (!customer?.firstName || !customer?.lastName || !customer?.email || !customer?.phone) {
    return NextResponse.json({ data: null, error: "customer firstName, lastName, email, and phone are required" }, { status: 400 })
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ data: null, error: "At least one line is required" }, { status: 400 })
  }

  const startDate = new Date(pickupDate)
  const dueDateEnd = new Date(dropoffDate)
  if (isNaN(startDate.getTime()) || isNaN(dueDateEnd.getTime()) || startDate >= dueDateEnd) {
    return NextResponse.json({ data: null, error: "Invalid date range — dropoffDate must be after pickupDate" }, { status: 400 })
  }

  for (const line of lines) {
    if (!["item", "tentConfig"].includes(line.kind) || !Number.isInteger(Number(line.refId)) || Number(line.qty) < 1) {
      return NextResponse.json(
        { data: null, error: "Each line requires kind ('item'|'tentConfig'), integer refId, and qty >= 1" },
        { status: 400 },
      )
    }
  }

  // Validate availability before accepting the order
  const validationLines = lines.map((l: any) => ({ kind: l.kind, refId: Number(l.refId), qty: Number(l.qty) }))
  const validation = await validateOrderLines(validationLines, startDate, dueDateEnd)
  if (!validation.ok) {
    return NextResponse.json({
      data: null,
      error: "Some items are no longer available for your dates",
      conflicts: validation.conflicts,
    }, { status: 409 })
  }

  // Look up prices from DB — never trust client-sent prices
  const itemRefIds = lines.filter((l: any) => l.kind === "item").map((l: any) => Number(l.refId))
  const configRefIds = lines.filter((l: any) => l.kind === "tentConfig").map((l: any) => Number(l.refId))

  const [dbItems, dbConfigs] = await Promise.all([
    itemRefIds.length
      ? prisma.item.findMany({ where: { id: { in: itemRefIds } }, select: { id: true, name: true, flatPrice: true } })
      : Promise.resolve([]),
    configRefIds.length
      ? prisma.tentConfiguration.findMany({ where: { id: { in: configRefIds } }, select: { id: true, name: true, flatPrice: true } })
      : Promise.resolve([]),
  ])

  const itemMap = new Map(dbItems.map((i) => [i.id, i]))
  const configMap = new Map(dbConfigs.map((c) => [c.id, c]))

  const lineItemRows = lines.map((line: any, idx: number) => {
    const ref = line.kind === "item" ? itemMap.get(Number(line.refId)) : configMap.get(Number(line.refId))
    if (!ref) throw new Error(`${line.kind} ${line.refId} not found`)
    const unitPrice = Number(ref.flatPrice)
    const warn = validation.warnings.find((w) => w.kind === line.kind && w.refId === Number(line.refId))
    return {
      description: ref.name,
      qty: Number(line.qty),
      unitPrice,
      lineTotal: Number(line.qty) * unitPrice,
      unitCost: 0,
      sortOrder: idx,
      notes: line.notes ?? null,
      availabilityWarning: warn ? `Low stock: ${warn.available} available for these dates` : null,
      ...(line.kind === "item" ? { itemId: Number(line.refId) } : { tentConfigId: Number(line.refId) }),
    }
  })

  // Upsert a guest user so customer contact info lives in the system
  const guestUser = await prisma.user.upsert({
    where: { email: customer.email.toLowerCase() },
    update: {},
    create: {
      email: customer.email.toLowerCase(),
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      role: "user",
      password: "__guest__",
    },
    select: { id: true },
  })

  const taxSetting = await prisma.universalSettings.findUnique({ where: { setting: "taxRate" } })
  const taxRate = taxSetting ? Number(taxSetting.value) : 0
  const totals = computeOrderTotals({ lineItems: lineItemRows, setUpCosts: [], taxRate })

  const order = await prisma.order.create({
    data: {
      state: { connect: { id: 1 } },
      user: { connect: { id: guestUser.id } },
      startDate,
      dueDateEnd,
      customerNotes: customerNotes ?? null,
      token: generateToken(),
      createdBy: customer.email,
      ...totals,
      orderLineItems: { create: lineItemRows },
    },
    select: { id: true, token: true },
  })

  return NextResponse.json({ data: { id: order.id, token: order.token }, error: null }, { status: 201 })
}
```

Then modify the existing `POST` to move `body` up before the role checks, and insert the detection branch.

The current POST begins (lines 35–41 in the file):
```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role ?? "anonymous"
  const isStaff = role === "admin" || role === "employee"
  const isPublic = !session

  const body = await req.json()
```

Change **only the opening block** to (move `body` to line 2 of the function, add detection branch — everything after `isPublic` is unchanged):

```typescript
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const body = await req.json()

  // Public shop quote — different payload shape
  if (body.pickupDate !== undefined) {
    return handlePublicShopQuote(body)
  }

  // Staff path — everything below is unchanged from the original file
  const role = session?.user?.role ?? "anonymous"
  const isStaff = role === "admin" || role === "employee"
  const isPublic = !session
  const { customerNotes, notes, dueDate, isHardDeadline, needsShipping, taxDeferralRequested, lineItems = [] } = body
  // ...rest of existing POST body unchanged
```

**Important:** The only change here is moving `const body = await req.json()` from after `isPublic` to immediately after `session`, then inserting the 4-line detection branch. Do NOT remove, duplicate, or rewrite any other lines.

**Note on admin notifications:** The existing POST sends admin notifications for public (`!session`) orders via a notification block near its end. The new `handlePublicShopQuote` does not include this — admin notifications for shop quotes are out of scope for G2. Admins will see new orders on the dashboard on next load.

- [ ] **Step 3: Smoke test — verify public shop order creation**

Find a real item ID:
```bash
curl -s "http://localhost:3000/api/inventory/items" | jq '.data[0] | {id, name}'
```

Submit a quote (replace `refId` with the actual ID):
```bash
curl -s -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "pickupDate": "2026-07-01",
    "dropoffDate": "2026-07-03",
    "customer": {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "phone": "2085551234"
    },
    "lines": [
      { "kind": "item", "refId": 1, "qty": 5, "notes": null }
    ],
    "customerNotes": "Backyard wedding in Eagle"
  }' | jq '.'
```

Expected: `{ "data": { "id": <N>, "token": "ord-..." }, "error": null }` with HTTP 201.

- [ ] **Step 4: Verify the staff path still works**

Sign in as admin in the browser, open `/get-quote`, submit a quote via the normal form. It should still work without errors.

---

## Route Summary

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/inventory/categories` | GET | None | All active categories sorted by sortOrder |
| `/api/inventory/items` | GET | None | Optional `?categoryId=&from=&to=` |
| `/api/inventory/items/[slug]` | GET | None | `cost` field returns `0` unless admin session |
| `/api/inventory/tent-configurations` | GET | None | Optional `?from=&to=` |
| `/api/inventory/tent-configurations/[slug]` | GET | None | Includes BOM parts; `cost` stripped for non-admin |
| `/api/inventory/availability` | GET | None | `?itemIds=&configIds=&from=&to=` |
| `/api/orders` | POST | None / Staff | Detects `pickupDate` → public shop handler |
