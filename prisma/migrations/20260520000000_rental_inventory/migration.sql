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
