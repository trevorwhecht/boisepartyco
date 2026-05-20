# G1: Foundation — Schema, Services & Seed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the rental inventory schema to the database, copy the pure availability library and Prisma service, and reseed with real item data.

**Architecture:** The design team provided all schema, service, and seed code in `~/Downloads/nextjs/`. This plan integrates that code into the repo, makes necessary adaptations (drop OrderLineItemVariant, fix import paths), and verifies the DB is healthy.

**Tech Stack:** Prisma 6, PostgreSQL, TypeScript, Next.js 16

---

## File Map

| Action | File |
|---|---|
| Modify | `prisma/schema.prisma` |
| Create | `prisma/migrations/20260520000000_rental_inventory/migration.sql` |
| Create | `src/lib/availability.ts` |
| Create | `src/models/inventory.ts` |
| Create | `src/services/inventoryService.ts` |
| Modify | `prisma/seed.ts` |

---

### Task 1: Extend existing Prisma models (OrderState + OrderLineItem, drop Variant)

**Files:**
- Modify: `prisma/schema.prisma`

The existing `OrderState` model needs `consumesInventory`. The existing `OrderLineItem` model needs three new nullable fields and updated indexes. The `OrderLineItemVariant` model is dropped entirely (each variant is now its own SKU Item row).

- [ ] **Step 1: Add `consumesInventory` to `OrderState`**

Open `prisma/schema.prisma`. Find the `OrderState` model and add the field after `color`:

```prisma
model OrderState {
  id                Int      @id @default(autoincrement())
  name              String
  sortOrder         Int
  description       String?
  isActive          Boolean  @default(true)
  isRequired        Boolean  @default(false)
  color             String?
  consumesInventory Boolean  @default(false)   // inventory reserved once deposit received
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  orders            Order[]
}
```

- [ ] **Step 2: Replace `OrderLineItem` model**

Find the existing `OrderLineItem` model (which has a `variants` relation) and replace it entirely:

```prisma
model OrderLineItem {
  id                  Int                @id @default(autoincrement())
  orderId             Int
  description         String
  qty                 Int                @default(1)
  unitPrice           Decimal            @default(0) @db.Decimal(10, 2)
  lineTotal           Decimal            @default(0) @db.Decimal(10, 2)
  unitCost            Decimal            @default(0) @db.Decimal(10, 2)
  sortOrder           Int                @default(0)
  notes               String?
  itemId              Int?
  tentConfigId        Int?
  availabilityWarning String?
  createdAt           DateTime           @default(now())
  updatedAt           DateTime           @updatedAt
  createdBy           String?
  updatedBy           String?

  order      Order              @relation(fields: [orderId], references: [id], onDelete: Cascade)
  item       Item?              @relation(fields: [itemId], references: [id], onDelete: SetNull)
  tentConfig TentConfiguration? @relation(fields: [tentConfigId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([itemId])
  @@index([tentConfigId])
}
```

- [ ] **Step 3: Delete the `OrderLineItemVariant` model**

Remove this entire block from `schema.prisma`:

```prisma
model OrderLineItemVariant {
  id              Int      @id @default(autoincrement())
  orderLineItemId Int
  variant         String
  qty             Int
  price           Decimal  @db.Decimal(10, 2)
  cost            Decimal? @db.Decimal(10, 2)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  orderLineItem OrderLineItem @relation(fields: [orderLineItemId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 4: Delete `LineItemPreset` model**

Remove this entire block:

```prisma
// STUB — replace this table with your real inventory catalog when forking.
model LineItemPreset {
  id           Int      @id @default(autoincrement())
  name         String
  description  String?
  defaultPrice Decimal  @db.Decimal(10, 2)
  defaultCost  Decimal  @db.Decimal(10, 2)
  sortOrder    Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("line_item_presets")
}
```

---

### Task 2: Add new inventory models to schema

**Files:**
- Modify: `prisma/schema.prisma` (append below existing models, before NextAuth models)

- [ ] **Step 1: Append Category and Item models**

```prisma
// =============================================================================
// RENTAL INVENTORY
// =============================================================================

model Category {
  id           Int       @id @default(autoincrement())
  slug         String    @unique
  name         String
  description  String?
  isSerialized Boolean   @default(false)
  sortOrder    Int       @default(0)
  isActive     Boolean   @default(true)
  items        Item[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Item {
  id              Int       @id @default(autoincrement())
  sku             String    @unique
  slug            String    @unique
  name            String
  description     String?
  blurb           String?
  categoryId      Int
  category        Category  @relation(fields: [categoryId], references: [id])
  subcategory     String?
  flatPrice       Decimal   @db.Decimal(10, 2)
  cost            Decimal   @db.Decimal(10, 2) @default(0)
  qty             Int?
  size            String?
  capacity        String?
  pricingMode     String    @default("per_day")
  pricingNote     String?
  sortOrder       Int       @default(0)
  isActive        Boolean   @default(true)
  primaryImageUrl String?
  images          ItemImage[]
  tentSpec        TentSpec?
  chairSpec       ChairSpec?
  tableSpec       TableSpec?
  linenSpec       LinenSpec?
  decorationSpec  DecorationSpec?
  heaterSpec      HeaterSpec?
  floorSpec       FloorSpec?
  cateringSpec    CateringSpec?
  lightingSpec    LightingSpec?
  serializedUnits SerializedUnit[]
  orderLineItems  OrderLineItem[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([categoryId, sortOrder])
  @@index([isActive])
}

model ItemImage {
  id        Int      @id @default(autoincrement())
  itemId    Int
  item      Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  url       String
  alt       String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Append TentConfiguration, TentPart, TentConfigPart, SerializedUnit**

```prisma
model TentConfiguration {
  id              Int               @id @default(autoincrement())
  slug            String            @unique
  name            String
  widthFt         Int
  lengthFt        Int
  flatPrice       Decimal           @db.Decimal(10, 2)
  cost            Decimal           @db.Decimal(10, 2) @default(0)
  blurb           String?
  description     String?
  capacity        String?
  sortOrder       Int               @default(0)
  isActive        Boolean           @default(true)
  bomComplete     Boolean           @default(false)
  primaryImageUrl String?
  bomParts        TentConfigPart[]
  orderLineItems  OrderLineItem[]
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([isActive, sortOrder])
}

model TentPart {
  id              Int              @id @default(autoincrement())
  name            String
  partType        String
  isSerialized    Boolean          @default(false)
  qty             Int?
  isActive        Boolean          @default(true)
  serializedUnits SerializedUnit[]
  bomEntries      TentConfigPart[]
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([partType])
  @@index([isActive])
}

model TentConfigPart {
  id           Int               @id @default(autoincrement())
  tentConfigId Int
  tentConfig   TentConfiguration @relation(fields: [tentConfigId], references: [id], onDelete: Cascade)
  tentPartId   Int
  tentPart     TentPart          @relation(fields: [tentPartId], references: [id], onDelete: Restrict)
  qtyRequired  Int
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  @@unique([tentConfigId, tentPartId])
  @@index([tentConfigId])
  @@index([tentPartId])
}

model SerializedUnit {
  id            Int       @id @default(autoincrement())
  itemId        Int?
  item          Item?     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tentPartId    Int?
  tentPart      TentPart? @relation(fields: [tentPartId], references: [id], onDelete: Cascade)
  serialNumber  String    @unique
  status        String    @default("available")
  notes         String?
  damagePhotoUrl String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([itemId])
  @@index([tentPartId])
  @@index([status])
}
```

- [ ] **Step 3: Append all 9 Spec tables**

```prisma
model TentSpec {
  id       Int    @id @default(autoincrement())
  itemId   Int    @unique
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  widthFt  Int
  lengthFt Int
  style    String?
}

model ChairSpec {
  id          Int      @id @default(autoincrement())
  itemId      Int      @unique
  item        Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  material    String?
  color       String?
  hasArmrests Boolean?
}

model TableSpec {
  id       Int    @id @default(autoincrement())
  itemId   Int    @unique
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  shape    String
  widthIn  Int?
  lengthIn Int?
}

model LinenSpec {
  id       Int    @id @default(autoincrement())
  itemId   Int    @unique
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  linType  String
  widthIn  Int?
  lengthIn Int?
}

model DecorationSpec {
  id       Int    @id @default(autoincrement())
  itemId   Int    @unique
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  decType  String?
  widthIn  Int?
  heightIn Int?
}

model HeaterSpec {
  id          Int    @id @default(autoincrement())
  itemId      Int    @unique
  item        Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  heaterType  String
  fuelType    String?
  btu         Int?
}

model FloorSpec {
  id       Int    @id @default(autoincrement())
  itemId   Int    @unique
  item     Item   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  widthFt  Int
  lengthFt Int
  material String?
}

model CateringSpec {
  id             Int      @id @default(autoincrement())
  itemId         Int      @unique
  item           Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  equipmentType  String?
  capacityLiters Decimal? @db.Decimal(8, 2)
  includesLid    Boolean?
}

model LightingSpec {
  id           Int      @id @default(autoincrement())
  itemId       Int      @unique
  item         Item     @relation(fields: [itemId], references: [id], onDelete: Cascade)
  lightType    String
  pricePerFoot Decimal? @db.Decimal(10, 2)
  minFeet      Int?
}
```

- [ ] **Step 4: Verify schema compiles**

```bash
npx prisma validate
```

Expected: `The schema at prisma/schema.prisma is valid`

---

### Task 3: Create the migration SQL file

**Files:**
- Create: `prisma/migrations/20260520000000_rental_inventory/migration.sql`

The migration was pre-written by the design team. We add one additional step to drop the variant table and remove the FK from OrderLineItem.

- [ ] **Step 1: Create migration directory**

```bash
mkdir -p prisma/migrations/20260520000000_rental_inventory
```

- [ ] **Step 2: Create migration.sql**

Create `prisma/migrations/20260520000000_rental_inventory/migration.sql` with this content:

```sql
-- Rental inventory schema v4 — drops LineItemPreset + OrderLineItemVariant,
-- adds Category/Item/TentConfiguration and the full BOM + serialized-unit system.

-- =============================================================================
-- DROP stub tables
-- =============================================================================
DROP TABLE IF EXISTS "line_item_presets";
DROP TABLE IF EXISTS "OrderLineItemVariant";

-- =============================================================================
-- ALTER existing tables — backwards-compatible additions only
-- =============================================================================

ALTER TABLE "OrderState"
  ADD COLUMN IF NOT EXISTS "consumesInventory" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OrderLineItem"
  ADD COLUMN IF NOT EXISTS "itemId" INTEGER,
  ADD COLUMN IF NOT EXISTS "tentConfigId" INTEGER,
  ADD COLUMN IF NOT EXISTS "availabilityWarning" TEXT;

-- =============================================================================
-- CREATE new tables
-- =============================================================================

CREATE TABLE "Category" (
  "id"           SERIAL PRIMARY KEY,
  "slug"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "isSerialized" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

CREATE TABLE "Item" (
  "id"              SERIAL PRIMARY KEY,
  "sku"             TEXT NOT NULL,
  "slug"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "blurb"           TEXT,
  "categoryId"      INTEGER NOT NULL,
  "subcategory"     TEXT,
  "flatPrice"       DECIMAL(10,2) NOT NULL,
  "cost"            DECIMAL(10,2) NOT NULL DEFAULT 0,
  "qty"             INTEGER,
  "size"            TEXT,
  "capacity"        TEXT,
  "pricingMode"     TEXT NOT NULL DEFAULT 'per_day',
  "pricingNote"     TEXT,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "primaryImageUrl" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Item_sku_key" ON "Item"("sku");
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");
CREATE INDEX "Item_categoryId_sortOrder_idx" ON "Item"("categoryId", "sortOrder");
CREATE INDEX "Item_isActive_idx" ON "Item"("isActive");

CREATE TABLE "ItemImage" (
  "id"        SERIAL PRIMARY KEY,
  "itemId"    INTEGER NOT NULL,
  "url"       TEXT NOT NULL,
  "alt"       TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ItemImage_itemId_idx" ON "ItemImage"("itemId");

CREATE TABLE "TentConfiguration" (
  "id"              SERIAL PRIMARY KEY,
  "slug"            TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "widthFt"         INTEGER NOT NULL,
  "lengthFt"        INTEGER NOT NULL,
  "flatPrice"       DECIMAL(10,2) NOT NULL,
  "cost"            DECIMAL(10,2) NOT NULL DEFAULT 0,
  "blurb"           TEXT,
  "description"     TEXT,
  "capacity"        TEXT,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "bomComplete"     BOOLEAN NOT NULL DEFAULT false,
  "primaryImageUrl" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TentConfiguration_slug_key" ON "TentConfiguration"("slug");
CREATE INDEX "TentConfiguration_isActive_sortOrder_idx" ON "TentConfiguration"("isActive", "sortOrder");

CREATE TABLE "TentPart" (
  "id"           SERIAL PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "partType"     TEXT NOT NULL,
  "isSerialized" BOOLEAN NOT NULL DEFAULT false,
  "qty"          INTEGER,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "TentPart_partType_idx" ON "TentPart"("partType");
CREATE INDEX "TentPart_isActive_idx" ON "TentPart"("isActive");

CREATE TABLE "TentConfigPart" (
  "id"           SERIAL PRIMARY KEY,
  "tentConfigId" INTEGER NOT NULL,
  "tentPartId"   INTEGER NOT NULL,
  "qtyRequired"  INTEGER NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TentConfigPart_tentConfigId_tentPartId_key" ON "TentConfigPart"("tentConfigId", "tentPartId");
CREATE INDEX "TentConfigPart_tentConfigId_idx" ON "TentConfigPart"("tentConfigId");
CREATE INDEX "TentConfigPart_tentPartId_idx" ON "TentConfigPart"("tentPartId");

CREATE TABLE "SerializedUnit" (
  "id"             SERIAL PRIMARY KEY,
  "itemId"         INTEGER,
  "tentPartId"     INTEGER,
  "serialNumber"   TEXT NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'available',
  "notes"          TEXT,
  "damagePhotoUrl" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SerializedUnit_serialNumber_key" ON "SerializedUnit"("serialNumber");
CREATE INDEX "SerializedUnit_itemId_idx" ON "SerializedUnit"("itemId");
CREATE INDEX "SerializedUnit_tentPartId_idx" ON "SerializedUnit"("tentPartId");
CREATE INDEX "SerializedUnit_status_idx" ON "SerializedUnit"("status");

CREATE TABLE "TentSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "widthFt" INTEGER NOT NULL, "lengthFt" INTEGER NOT NULL, "style" TEXT
);
CREATE UNIQUE INDEX "TentSpec_itemId_key" ON "TentSpec"("itemId");

CREATE TABLE "ChairSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "material" TEXT, "color" TEXT, "hasArmrests" BOOLEAN
);
CREATE UNIQUE INDEX "ChairSpec_itemId_key" ON "ChairSpec"("itemId");

CREATE TABLE "TableSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "shape" TEXT NOT NULL, "widthIn" INTEGER, "lengthIn" INTEGER
);
CREATE UNIQUE INDEX "TableSpec_itemId_key" ON "TableSpec"("itemId");

CREATE TABLE "LinenSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "linType" TEXT NOT NULL, "widthIn" INTEGER, "lengthIn" INTEGER
);
CREATE UNIQUE INDEX "LinenSpec_itemId_key" ON "LinenSpec"("itemId");

CREATE TABLE "DecorationSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "decType" TEXT, "widthIn" INTEGER, "heightIn" INTEGER
);
CREATE UNIQUE INDEX "DecorationSpec_itemId_key" ON "DecorationSpec"("itemId");

CREATE TABLE "HeaterSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "heaterType" TEXT NOT NULL, "fuelType" TEXT, "btu" INTEGER
);
CREATE UNIQUE INDEX "HeaterSpec_itemId_key" ON "HeaterSpec"("itemId");

CREATE TABLE "FloorSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "widthFt" INTEGER NOT NULL, "lengthFt" INTEGER NOT NULL, "material" TEXT
);
CREATE UNIQUE INDEX "FloorSpec_itemId_key" ON "FloorSpec"("itemId");

CREATE TABLE "CateringSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "equipmentType" TEXT, "capacityLiters" DECIMAL(8,2), "includesLid" BOOLEAN
);
CREATE UNIQUE INDEX "CateringSpec_itemId_key" ON "CateringSpec"("itemId");

CREATE TABLE "LightingSpec" (
  "id" SERIAL PRIMARY KEY, "itemId" INTEGER NOT NULL, "lightType" TEXT NOT NULL, "pricePerFoot" DECIMAL(10,2), "minFeet" INTEGER
);
CREATE UNIQUE INDEX "LightingSpec_itemId_key" ON "LightingSpec"("itemId");

-- =============================================================================
-- FOREIGN KEYS
-- =============================================================================

ALTER TABLE "OrderLineItem"
  ADD CONSTRAINT "OrderLineItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderLineItem"
  ADD CONSTRAINT "OrderLineItem_tentConfigId_fkey"
  FOREIGN KEY ("tentConfigId") REFERENCES "TentConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "OrderLineItem_itemId_idx" ON "OrderLineItem"("itemId");
CREATE INDEX "OrderLineItem_tentConfigId_idx" ON "OrderLineItem"("tentConfigId");

ALTER TABLE "Item"
  ADD CONSTRAINT "Item_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItemImage"
  ADD CONSTRAINT "ItemImage_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TentConfigPart"
  ADD CONSTRAINT "TentConfigPart_tentConfigId_fkey"
  FOREIGN KEY ("tentConfigId") REFERENCES "TentConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TentConfigPart"
  ADD CONSTRAINT "TentConfigPart_tentPartId_fkey"
  FOREIGN KEY ("tentPartId") REFERENCES "TentPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SerializedUnit"
  ADD CONSTRAINT "SerializedUnit_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SerializedUnit"
  ADD CONSTRAINT "SerializedUnit_tentPartId_fkey"
  FOREIGN KEY ("tentPartId") REFERENCES "TentPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TentSpec"       ADD CONSTRAINT "TentSpec_itemId_fkey"       FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "ChairSpec"      ADD CONSTRAINT "ChairSpec_itemId_fkey"      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "TableSpec"      ADD CONSTRAINT "TableSpec_itemId_fkey"      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "LinenSpec"      ADD CONSTRAINT "LinenSpec_itemId_fkey"      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "DecorationSpec" ADD CONSTRAINT "DecorationSpec_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "HeaterSpec"     ADD CONSTRAINT "HeaterSpec_itemId_fkey"     FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "FloorSpec"      ADD CONSTRAINT "FloorSpec_itemId_fkey"      FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "CateringSpec"   ADD CONSTRAINT "CateringSpec_itemId_fkey"   FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
ALTER TABLE "LightingSpec"   ADD CONSTRAINT "LightingSpec_itemId_fkey"   FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE;
```

- [ ] **Step 3: Apply the migration**

Because the SQL file is hand-written (not auto-generated), run it directly then mark it as applied in Prisma's migration history:

```bash
npx prisma db execute --file prisma/migrations/20260520000000_rental_inventory/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied 20260520000000_rental_inventory
```

Expected output from the second command: `Migration 20260520000000_rental_inventory marked as applied.`

Do **not** use `prisma migrate dev` — that generates a new SQL file and ignores the one you just created.

- [ ] **Step 4: Regenerate client**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client`

---

### Task 4: Create pure availability library

**Files:**
- Create: `src/lib/availability.ts`

This is pure math with no Prisma dependency — copy exactly from the design team's file.

- [ ] **Step 1: Create the file**

Create `src/lib/availability.ts` with the exact content from `~/Downloads/nextjs/src/lib/availability.ts`. The file is complete and requires no modifications.

- [ ] **Step 1b: Verify required exports exist**

The G3 DateRangePicker and DateRangeField components import three date utility functions from this file. Confirm they are exported:

```bash
grep "^export function\|^export const" src/lib/availability.ts | grep -E "addDays|daysBetween|fmtRangeShort"
```

Expected: all three names appear in the output. If any are missing, add them to `availability.ts`:

```typescript
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000))
}

export function fmtRangeShort(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`
}
```

- [ ] **Step 2: Write unit tests**

Create `src/lib/availability.test.ts`:

```typescript
import { maxConcurrentBooked, buildAvailability, buildConfigAvailability } from "./availability"

const d = (offset: number) => {
  const x = new Date("2026-06-01")
  x.setDate(x.getDate() + offset)
  x.setHours(0, 0, 0, 0)
  return x
}

describe("maxConcurrentBooked", () => {
  it("returns 0 with no bookings", () => {
    expect(maxConcurrentBooked([], d(0), d(2))).toBe(0)
  })

  it("counts overlapping bookings on their peak day", () => {
    const bookings = [
      { qty: 10, start: d(0), end: d(2) },
      { qty: 5,  start: d(1), end: d(3) },
    ]
    // Day 0: 10, Day 1: 15, Day 2: 15, Day 3: 5 — but we query [d(0), d(2)] so max = 15
    expect(maxConcurrentBooked(bookings, d(0), d(2))).toBe(15)
  })

  it("ignores bookings outside the query range", () => {
    const bookings = [{ qty: 99, start: d(10), end: d(12) }]
    expect(maxConcurrentBooked(bookings, d(0), d(2))).toBe(0)
  })
})

describe("buildAvailability", () => {
  it("clamps available to 0 when overbooked", () => {
    const result = buildAvailability(10, 15)
    expect(result.available).toBe(0)
    expect(result.hasConflicts).toBe(true)
  })

  it("flags isLow when available <= 20% of stock", () => {
    expect(buildAvailability(100, 82).isLow).toBe(true)
    expect(buildAvailability(100, 50).isLow).toBe(false)
  })
})

describe("buildConfigAvailability", () => {
  it("returns zero with empty BOM (incomplete)", () => {
    const result = buildConfigAvailability([])
    expect(result.available).toBe(0)
    expect(result.bottleneckParts).toHaveLength(0)
  })

  it("constrains config count by the tightest part", () => {
    const parts = [
      { tentPartId: 1, name: "Panel", stock: 4, booked: 0, qtyRequired: 2 }, // max 2
      { tentPartId: 2, name: "Pole",  stock: 30, booked: 0, qtyRequired: 6 }, // max 5
    ]
    const result = buildConfigAvailability(parts)
    expect(result.available).toBe(2)
    expect(result.bottleneckParts[0].tentPartId).toBe(1)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npx jest src/lib/availability.test.ts
```

Expected: `Tests: 7 passed, 7 total` (3 describe blocks, 7 `it()` cases)

---

### Task 5: Create inventory domain types

**Files:**
- Create: `src/models/inventory.ts`

- [ ] **Step 1: Create the file**

Create `src/models/inventory.ts` with the exact content from `~/Downloads/nextjs/src/models/inventory.ts`. The file is complete and requires no modifications.

---

### Task 6: Create inventory service

**Files:**
- Create: `src/services/inventoryService.ts`

The design team's file imports from `@/lib/prisma` — verify that matches the existing prisma client path.

- [ ] **Step 1: Verify prisma client path**

```bash
cat src/lib/prisma.ts | head -5
```

Expected: file exports a `prisma` PrismaClient singleton. The import path `@/lib/prisma` should work as-is.

- [ ] **Step 2: Create the file**

Create `src/services/inventoryService.ts` with the content from `~/Downloads/nextjs/src/services/inventoryService.ts`.

The only change needed: ensure the import at line 1 reads:

```typescript
import { prisma } from "@/lib/prisma"
```

(The design file may say `"@/lib/prisma"` already — confirm and leave as-is.)

- [ ] **Step 3: Verify required exports exist**

G2 and G4 import specific functions from this service. Confirm they are all exported:

```bash
grep "^export async function\|^export function" src/services/inventoryService.ts
```

Required exports:
- `getItemAvailability`
- `getBulkItemAvailability`
- `getTentConfigAvailability`
- `getBulkTentConfigAvailability`
- `validateOrderLines`

If any are missing, **stop and notify Trevor** — do not invent implementations for missing functions.

The `validateOrderLines` function must return `{ ok: boolean, conflicts: Array<{kind, refId}>, warnings: Array<{kind, refId, available}> }`. Verify this shape matches the design file's actual return type before proceeding to G2.

---

### Task 7: Update the seed file

**Files:**
- Modify: `prisma/seed.ts`

Three changes: (1) remove the `LINE_ITEM_PRESETS` array and its upsert loop, (2) remove variants from the test order, (3) import and call `seedRentalInventory`.

- [ ] **Step 1: Remove LINE_ITEM_PRESETS constant and seeding block**

Find and delete the `LINE_ITEM_PRESETS` constant (lines ~38-42 in the current seed):

```typescript
const LINE_ITEM_PRESETS = [
  { id: 1, name: "Standard T-Shirt", ... },
  { id: 2, name: "Premium Hoodie",   ... },
  { id: 3, name: "Custom Item",      ... },
]
```

Then find and delete the seeding block:

```typescript
console.log("Seeding line item presets...")
for (const p of LINE_ITEM_PRESETS) {
  await prisma.lineItemPreset.upsert({ ... })
}
```

- [ ] **Step 2: Remove variant creation from test order**

Find the test order creation block (the `prisma.order.create` call). Remove the `variants: { create: [...] }` nested blocks from both line items. The result should be:

```typescript
orderLineItems: {
  create: [
    {
      description: "Custom T-Shirts",
      qty: 12,
      unitPrice: 10.00,
      lineTotal: 120.00,
      unitCost: 5.00,
      sortOrder: 0,
    },
    {
      description: "Custom Hoodies",
      qty: 12,
      unitPrice: 10.00,
      lineTotal: 120.00,
      unitCost: 5.00,
      sortOrder: 1,
    },
  ],
},
```

- [ ] **Step 3: Add seedRentalInventory import and call**

At the top of `prisma/seed.ts`, after the existing imports, add:

```typescript
import { seedRentalInventory } from "./seed-rental"
```

Then create `prisma/seed-rental.ts` by copying the exact content from `~/Downloads/nextjs/prisma/seed-rental.ts`. No modifications needed.

At the end of the `main()` function in `seed.ts`, before the closing brace, add:

```typescript
await seedRentalInventory(prisma)
```

- [ ] **Step 4: Run the seed**

```bash
npx prisma db seed
```

Expected output includes:
```
▸ Seeding rental inventory…
  · OrderState.consumesInventory set on N states (sortOrder ≥ 3)
  · 9 categories upserted
  · 19 tent parts upserted
  · 19 tent configurations upserted
  · ~60 BOM rows inserted across 7 configs
  · 40+ items + specs upserted
▸ Rental inventory seed complete.
```

- [ ] **Step 5: Verify item count in DB**

```bash
npx prisma studio
```

Open browser → confirm:
- `Category` table has 9 rows
- `Item` table has 40+ rows
- `TentConfiguration` table has 19 rows
- `TentPart` table has 19 rows
- `TentConfigPart` table has ~60 rows
- `OrderState` rows with `sortOrder >= 3` have `consumesInventory = true`

Close Prisma Studio when done.

---

### Task 8: Verify build compiles

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors related to the new models.

**Acceptable new errors** introduced by this migration (other files still reference removed models; G5 will clean them up):
- `Property 'lineItemPreset' does not exist on type 'PrismaClient'`
- `Property 'orderLineItemVariant' does not exist on type 'PrismaClient'`
- `Property 'variants' does not exist on type 'OrderLineItemDelegate'`

**Not acceptable** — fix before proceeding: any other type errors, especially in `src/lib/`, `src/services/`, or `src/models/`.

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma \
        prisma/migrations/20260520000000_rental_inventory/ \
        prisma/seed.ts \
        prisma/seed-rental.ts \
        src/lib/availability.ts \
        src/lib/availability.test.ts \
        src/models/inventory.ts \
        src/services/inventoryService.ts
git commit -m "feat(G1): add rental inventory schema, availability service, and seed data

- Adds Category, Item, TentConfiguration, TentPart, TentConfigPart, SerializedUnit
- Adds 9 category-specific Spec tables (1:1 with Item)
- Adds consumesInventory flag to OrderState
- Adds itemId, tentConfigId, availabilityWarning to OrderLineItem
- Drops OrderLineItemVariant and LineItemPreset tables
- Provides pure availability math in lib/availability.ts (fully unit-tested)
- Seeds 9 categories, 19 tent configs, 40+ items with real pricing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
