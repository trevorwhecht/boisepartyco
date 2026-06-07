// =============================================================================
// Rental inventory seed.
//
// Append a call to seedRentalInventory(prisma) to your existing
// prisma/seed.ts main() — AFTER OrderState seeding (we set
// consumesInventory on those rows here too).
//
// Idempotent: uses upsert by slug/sku throughout. Safe to re-run.
// =============================================================================

import type { PrismaClient } from "@prisma/client"

// -----------------------------------------------------------------------------
// CATEGORIES
// -----------------------------------------------------------------------------
const CATEGORIES = [
  { slug: "tent",       name: "Tent",            isSerialized: true,  sortOrder: 1 },
  { slug: "chair",      name: "Chair",           isSerialized: false, sortOrder: 2 },
  { slug: "table",      name: "Table",           isSerialized: false, sortOrder: 3 },
  { slug: "linen",      name: "Linen",           isSerialized: false, sortOrder: 4 },
  { slug: "decoration", name: "Decoration",     isSerialized: true,  sortOrder: 5 },
  { slug: "floor",      name: "Dance Floor",     isSerialized: false, sortOrder: 6 },
  { slug: "heater",     name: "Heater",          isSerialized: true,  sortOrder: 7 },
  { slug: "catering",   name: "Catering",        isSerialized: false, sortOrder: 8 },
  { slug: "lighting",   name: "Lighting",        isSerialized: false, sortOrder: 9 },
] as const

// -----------------------------------------------------------------------------
// TENT PARTS (master list)
// -----------------------------------------------------------------------------
const TENT_PARTS = [
  // panels — qty-based (bulk count, not individually serialized)
  { name: "End Panel 10'x10'", partType: "panel",    isSerialized: false, qty: null },
  { name: "End Panel 10'x20'", partType: "panel",    isSerialized: false, qty: null },
  { name: "End Panel 15'x15'", partType: "panel",    isSerialized: false, qty: null },
  { name: "Mid Panel 10'x20'", partType: "panel",    isSerialized: false, qty: null },
  { name: "Mid Panel 20'x20'", partType: "panel",    isSerialized: false, qty: null },
  // poles
  { name: "Black Pole 7'8\"",  partType: "pole",     isSerialized: false, qty: 0 },
  { name: "White Pole 9'4\"",  partType: "pole",     isSerialized: false, qty: 0 },
  { name: "Green Pole 4'11\"", partType: "pole",     isSerialized: false, qty: 0 },
  { name: "Green Pole 6'10\"", partType: "pole",     isSerialized: false, qty: 0 },
  { name: "Green Pole 10'6\"", partType: "pole",     isSerialized: false, qty: 0 },
  { name: "Red Pole 14'4\"",   partType: "pole",     isSerialized: false, qty: 0 },
  // crowns
  { name: "8-Way Crown",       partType: "crown",    isSerialized: false, qty: 0 },
  { name: "6-Way Crown",       partType: "crown",    isSerialized: false, qty: 0 },
  { name: "4-Way Crown",       partType: "crown",    isSerialized: false, qty: 0 },
  { name: "3-Way Crown",       partType: "crown",    isSerialized: false, qty: 0 },
  { name: "Ridge Crown",       partType: "crown",    isSerialized: false, qty: 0 },
  { name: "Adj. Crown",        partType: "crown",    isSerialized: false, qty: 0 },
  // hardware
  { name: "Corner",            partType: "hardware", isSerialized: false, qty: 0 },
  { name: "Side Tee w/ Ring",  partType: "hardware", isSerialized: false, qty: 0 },
] as const

// -----------------------------------------------------------------------------
// TENT CONFIGURATIONS — customer-facing tent sizes (built from parts)
// -----------------------------------------------------------------------------
const TENT_CONFIGS = [
  { slug: "10x20-tent",    name: "10' x 20' Tent",   widthFt: 10, lengthFt: 20, flatPrice: 200,  bomComplete: true,  capacity: "20 guests",  sortOrder: 1 },
  { slug: "10x10-pinnacle",name: "10'x10' Pinnacle", widthFt: 10, lengthFt: 10, flatPrice: 100,  bomComplete: true,  capacity: "10 guests",  sortOrder: 2 },
  { slug: "15x15-tent",    name: "15'x15' Tent",     widthFt: 15, lengthFt: 15, flatPrice: 330,  bomComplete: true,  capacity: "24 guests",  sortOrder: 3 },
  { slug: "20x20-tent",    name: "20'x20' Tent",     widthFt: 20, lengthFt: 20, flatPrice: 380,  bomComplete: true,  capacity: "32 guests",  sortOrder: 4 },
  { slug: "20x30-tent",    name: "20'x30' Tent",     widthFt: 20, lengthFt: 30, flatPrice: 510,  bomComplete: true,  capacity: "48 guests",  sortOrder: 5 },
  { slug: "20x40-tent",    name: "20'x40' Tent",     widthFt: 20, lengthFt: 40, flatPrice: 680,  bomComplete: true,  capacity: "64 guests",  sortOrder: 6 },
  { slug: "20x50-tent",    name: "20'x50' Tent",     widthFt: 20, lengthFt: 50, flatPrice: 800,  bomComplete: true,  capacity: "80 guests",  sortOrder: 7 },
  { slug: "20x60-tent",    name: "20'x60' Tent",     widthFt: 20, lengthFt: 60, flatPrice: 1100, bomComplete: false, capacity: "96 guests",  sortOrder: 8 },
  { slug: "20x70-tent",    name: "20'x70' Tent",     widthFt: 20, lengthFt: 70, flatPrice: 1300, bomComplete: false, capacity: "112 guests", sortOrder: 9 },
  { slug: "20x80-tent",    name: "20'x80' Tent",     widthFt: 20, lengthFt: 80, flatPrice: 1500, bomComplete: false, capacity: "128 guests", sortOrder: 10 },
  { slug: "20x90-tent",    name: "20'x90' Tent",     widthFt: 20, lengthFt: 90, flatPrice: 1650, bomComplete: false, capacity: "144 guests", sortOrder: 11 },
  { slug: "20x100-tent",   name: "20'x100' Tent",    widthFt: 20, lengthFt: 100,flatPrice: 1850, bomComplete: false, capacity: "160 guests", sortOrder: 12 },
  { slug: "30x30-tent",    name: "30'x30' Tent",     widthFt: 30, lengthFt: 30, flatPrice: 800,  bomComplete: false, capacity: "72 guests",  sortOrder: 13 },
  { slug: "30x45-tent",    name: "30'x45' Tent",     widthFt: 30, lengthFt: 45, flatPrice: 1200, bomComplete: false, capacity: "108 guests", sortOrder: 14 },
  { slug: "30x60-tent",    name: "30'x60' Tent",     widthFt: 30, lengthFt: 60, flatPrice: 1550, bomComplete: false, capacity: "144 guests", sortOrder: 15 },
  { slug: "30x75-tent",    name: "30'x75' Tent",     widthFt: 30, lengthFt: 75, flatPrice: 1900, bomComplete: false, capacity: "180 guests", sortOrder: 16 },
  { slug: "40x40-tent",    name: "40'x40' Tent",     widthFt: 40, lengthFt: 40, flatPrice: 1400, bomComplete: false, capacity: "128 guests", sortOrder: 17 },
  { slug: "40x60-tent",    name: "40'x60' Tent",     widthFt: 40, lengthFt: 60, flatPrice: 2000, bomComplete: false, capacity: "192 guests", sortOrder: 18 },
  { slug: "40x80-tent",    name: "40'x80' Tent",     widthFt: 40, lengthFt: 80, flatPrice: 3000, bomComplete: false, capacity: "256 guests", sortOrder: 19 },
] as const

// -----------------------------------------------------------------------------
// BOMS — keyed by config slug → [{ partName, qty }]
// Only the 7 confirmed configs from v4 spec are populated.
// -----------------------------------------------------------------------------
const BOMS: Record<string, { partName: string; qty: number }[]> = {
  "10x20-tent": [
    { partName: "End Panel 10'x20'", qty: 1 },
    { partName: "Black Pole 7'8\"",  qty: 6 },
    { partName: "White Pole 9'4\"",  qty: 7 },
    { partName: "Green Pole 4'11\"", qty: 2 },
    { partName: "Green Pole 6'10\"", qty: 4 },
    { partName: "4-Way Crown",       qty: 2 },
    { partName: "Adj. Crown",        qty: 1 },
    { partName: "Corner",            qty: 4 },
    { partName: "Side Tee w/ Ring",  qty: 2 },
  ],
  "10x10-pinnacle": [
    { partName: "End Panel 10'x10'", qty: 1 },
  ],
  "15x15-tent": [
    { partName: "End Panel 15'x15'", qty: 1 },
    { partName: "Black Pole 7'8\"",  qty: 4 },
    { partName: "Green Pole 6'10\"", qty: 4 },
    { partName: "Green Pole 10'6\"", qty: 4 },
    { partName: "Red Pole 14'4\"",   qty: 4 },
    { partName: "3-Way Crown",       qty: 1 },
    { partName: "Corner",            qty: 4 },
  ],
  "20x20-tent": [
    { partName: "End Panel 10'x20'", qty: 2 },
    { partName: "Black Pole 7'8\"",  qty: 8 },
    { partName: "White Pole 9'4\"",  qty: 8 },
    { partName: "Green Pole 6'10\"", qty: 4 },
    { partName: "Green Pole 10'6\"", qty: 4 },
    { partName: "Red Pole 14'4\"",   qty: 4 },
    { partName: "8-Way Crown",       qty: 1 },
    { partName: "Corner",            qty: 4 },
    { partName: "Side Tee w/ Ring",  qty: 4 },
  ],
  "20x30-tent": [
    { partName: "End Panel 10'x20'", qty: 2 },
    { partName: "Mid Panel 10'x20'", qty: 1 },
    { partName: "Black Pole 7'8\"",  qty: 10 },
    { partName: "White Pole 9'4\"",  qty: 11 },
    { partName: "Green Pole 6'10\"", qty: 6 },
    { partName: "Green Pole 10'6\"", qty: 4 },
    { partName: "6-Way Crown",       qty: 2 },
    { partName: "Corner",            qty: 4 },
    { partName: "Side Tee w/ Ring",  qty: 6 },
  ],
  "20x40-tent": [
    { partName: "End Panel 10'x20'", qty: 2 },
    { partName: "Mid Panel 20'x20'", qty: 1 },
    { partName: "Black Pole 7'8\"",  qty: 12 },
    { partName: "White Pole 9'4\"",  qty: 14 },
    { partName: "Green Pole 6'10\"", qty: 8 },
    { partName: "Green Pole 10'6\"", qty: 4 },
    { partName: "Red Pole 14'4\"",   qty: 4 },
    { partName: "6-Way Crown",       qty: 2 },
    { partName: "Ridge Crown",       qty: 1 },
    { partName: "Corner",            qty: 4 },
    { partName: "Side Tee w/ Ring",  qty: 8 },
  ],
  "20x50-tent": [
    { partName: "End Panel 10'x20'", qty: 2 },
    { partName: "Mid Panel 10'x20'", qty: 1 },
    { partName: "Mid Panel 20'x20'", qty: 1 },
    { partName: "Black Pole 7'8\"",  qty: 14 },
    { partName: "White Pole 9'4\"",  qty: 17 },
    { partName: "Green Pole 6'10\"", qty: 10 },
    { partName: "Green Pole 10'6\"", qty: 4 },
    { partName: "Red Pole 14'4\"",   qty: 4 },
    { partName: "6-Way Crown",       qty: 2 },
    { partName: "Ridge Crown",       qty: 2 },
  ],
}

// -----------------------------------------------------------------------------
// ITEMS — everything except tent configs.
//
// Tent base units (10x10 Pinnacle, 15x15) live ALSO as Items so we can store
// TentSpec rows for them. The customer-facing tent picker uses TentConfiguration
// rows — those Items are not shown in the regular Item lists.
// -----------------------------------------------------------------------------
type ItemSeed = {
  sku: string
  slug: string
  name: string
  blurb: string
  categorySlug: string
  subcategory: string
  flatPrice: number
  qty: number | null            // null = serialized
  size: string
  capacity: string
  pricingMode?: "per_day" | "per_foot" | "per_event"
  pricingNote?: string
  sortOrder?: number
  // Spec data — kind tells the seeder which spec table to populate
  spec?:
    | { kind: "tent"; widthFt: number; lengthFt: number; style: string }
    | { kind: "chair"; material: string; color: string; hasArmrests: boolean }
    | { kind: "table"; shape: string; widthIn?: number; lengthIn?: number }
    | { kind: "linen"; linType: string; widthIn?: number; lengthIn?: number }
    | { kind: "decoration"; decType: string; widthIn?: number; heightIn?: number }
    | { kind: "heater"; heaterType: string; fuelType?: string; btu?: number }
    | { kind: "floor"; widthFt: number; lengthFt: number; material?: string }
    | { kind: "catering"; equipmentType: string; capacityLiters?: number; includesLid?: boolean }
    | { kind: "lighting"; lightType: string; pricePerFoot?: number; minFeet?: number }
}

const ITEMS: ItemSeed[] = [
  // ── Tent base units (live as items because they're single physical things, not built) ──
  { sku: "TENT-10x10-PIN", slug: "10x10-pinnacle-base", name: "10'x10' Pinnacle Tent (base unit)", blurb: "Single-piece pop-up canopy.", categorySlug: "tent", subcategory: "Tent base units",  flatPrice: 100, qty: null, size: "10' × 10'", capacity: "10 guests", sortOrder: 1, spec: { kind: "tent", widthFt: 10, lengthFt: 10, style: "Pinnacle" } },
  { sku: "TENT-15x15",     slug: "15x15-base",          name: "15'x15' Tent (base unit)",          blurb: "Single-piece frame tent.",   categorySlug: "tent", subcategory: "Tent base units",  flatPrice: 330, qty: null, size: "15' × 15'", capacity: "24 guests", sortOrder: 2, spec: { kind: "tent", widthFt: 15, lengthFt: 15, style: "Frame" } },

  // ── Tent add-ons (priced per foot) ──
  { sku: "TENT-LIGHTS",   slug: "tent-lights",       name: "Tent Lights",     blurb: "Warm white string lights, priced per linear foot.", categorySlug: "lighting", subcategory: "Tent add-ons", flatPrice: 1, qty: 2000, size: "per ft", capacity: "per foot", pricingMode: "per_foot", pricingNote: "Priced per linear foot", sortOrder: 1, spec: { kind: "lighting", lightType: "string-lights", pricePerFoot: 1, minFeet: 10 } },
  { sku: "TENT-SIDEWALL", slug: "tent-side-wall",    name: "Tent Side Wall",  blurb: "Solid or clear sidewall panels — keeps wind out.",   categorySlug: "tent",     subcategory: "Tent add-ons", flatPrice: 5, qty: 1000, size: "per ft", capacity: "per foot", pricingMode: "per_foot", pricingNote: "Priced per linear foot", sortOrder: 3, spec: { kind: "decoration", decType: "side-wall" } },
  { sku: "TENT-HEATER",   slug: "tent-heater",       name: "Tent Heater",     blurb: "Indirect propane tent heater. Keeps a 30×30 cozy.",    categorySlug: "heater",   subcategory: "Tent add-ons", flatPrice: 225, qty: null, size: "propane",   capacity: "tent climate", sortOrder: 1, spec: { kind: "heater", heaterType: "heater", fuelType: "propane" } },
  { sku: "TENT-COOLER",   slug: "tent-cooler",       name: "Tent Cooler",     blurb: "Tent A/C unit — closed-wall summer essential.",         categorySlug: "heater",   subcategory: "Tent add-ons", flatPrice: 350, qty: null, size: "4-ton",     capacity: "tent climate", sortOrder: 2, spec: { kind: "heater", heaterType: "cooler", fuelType: "electric" } },

  // ── Tables ──
  { sku: "TBL-COCK-30",       slug: "cocktail-30-table",      name: "30\" Round Cocktail Table",  blurb: "42\" bar-height cocktail round.",        categorySlug: "table", subcategory: "Tables", flatPrice: 13,  qty: 30, size: "30\" Ø × 42\"H", capacity: "standing 4-6", sortOrder: 1,  spec: { kind: "table", shape: "cocktail", widthIn: 30 } },
  { sku: "TBL-RD-48",         slug: "48-round-table",         name: "48\" Round Table",            blurb: "Compact round. Seats 6.",                categorySlug: "table", subcategory: "Tables", flatPrice: 12,  qty: 24, size: "48\" Ø",          capacity: "seats 6",       sortOrder: 2,  spec: { kind: "table", shape: "round", widthIn: 48 } },
  { sku: "TBL-RD-60",         slug: "60-round-table",         name: "60\" Round Table",            blurb: "Classic banquet round. Seats 8.",       categorySlug: "table", subcategory: "Tables", flatPrice: 13,  qty: 60, size: "60\" Ø",          capacity: "seats 8",       sortOrder: 3,  spec: { kind: "table", shape: "round", widthIn: 60 } },
  { sku: "TBL-RD-60-P",       slug: "60-plastic-round-table", name: "60\" Plastic Round Table",   blurb: "Lightweight plastic round. Seats 8.",   categorySlug: "table", subcategory: "Tables", flatPrice: 12,  qty: 40, size: "60\" Ø",          capacity: "seats 8",       sortOrder: 4,  spec: { kind: "table", shape: "round", widthIn: 60 } },
  { sku: "TBL-BQ-4",          slug: "4ft-banquet-table",      name: "4' Wood Banquet Table",      blurb: "Compact rectangle.",                     categorySlug: "table", subcategory: "Tables", flatPrice: 11,  qty: 30, size: "4' × 30\"",       capacity: "seats 4",       sortOrder: 5,  spec: { kind: "table", shape: "rectangle", widthIn: 30, lengthIn: 48 } },
  { sku: "TBL-BQ-6",          slug: "6ft-banquet-table",      name: "6' Wood Banquet Table",      blurb: "Versatile 6' rectangle.",                categorySlug: "table", subcategory: "Tables", flatPrice: 12,  qty: 50, size: "6' × 30\"",       capacity: "seats 6-8",     sortOrder: 6,  spec: { kind: "table", shape: "rectangle", widthIn: 30, lengthIn: 72 } },
  { sku: "TBL-CONF-6",        slug: "6ft-conference-table",   name: "6'×30\" Conference Table",    blurb: "Slim-profile rectangle.",                categorySlug: "table", subcategory: "Tables", flatPrice: 10,  qty: 40, size: "6' × 30\"",       capacity: "seats 6",       sortOrder: 7,  spec: { kind: "table", shape: "conference", widthIn: 30, lengthIn: 72 } },
  { sku: "TBL-BQ-8",          slug: "8ft-banquet-table",      name: "8' Wood Banquet Table",      blurb: "Long banquet rectangle.",                categorySlug: "table", subcategory: "Tables", flatPrice: 13,  qty: 60, size: "8' × 30\"",       capacity: "seats 8-10",    sortOrder: 8,  spec: { kind: "table", shape: "rectangle", widthIn: 30, lengthIn: 96 } },
  { sku: "TBL-BQ-8-P",        slug: "8ft-plastic-banquet",    name: "8' Plastic Banquet Table",   blurb: "Lightweight plastic 8'.",                categorySlug: "table", subcategory: "Tables", flatPrice: 12,  qty: 50, size: "8' × 30\"",       capacity: "seats 8-10",    sortOrder: 9,  spec: { kind: "table", shape: "rectangle", widthIn: 30, lengthIn: 96 } },
  { sku: "TBL-CONF-8",        slug: "8ft-conference-table",   name: "8'×30\" Conference Table",    blurb: "Slim conference rectangle.",             categorySlug: "table", subcategory: "Tables", flatPrice: 11,  qty: 30, size: "8' × 30\"",       capacity: "seats 8",       sortOrder: 10, spec: { kind: "table", shape: "conference", widthIn: 30, lengthIn: 96 } },
  { sku: "TBL-FARM-8",        slug: "8ft-farm-table",         name: "8' Farm Table",              blurb: "Reclaimed-wood farm table. Seats 10.",   categorySlug: "table", subcategory: "Tables", flatPrice: 110, qty: 12, size: "8' × 40\"",       capacity: "seats 10",      sortOrder: 11, spec: { kind: "table", shape: "rectangle", widthIn: 40, lengthIn: 96 } },

  // ── Chairs ──
  { sku: "CHR-WD-RATTAN",  slug: "wood-rattan-chair",   name: "Wood Round Rattan Back Chair", blurb: "Round-rattan-back wood chair.",       categorySlug: "chair", subcategory: "Chairs", flatPrice: 25,  qty: 80,  size: "36\" H",  capacity: "per chair", sortOrder: 1, spec: { kind: "chair", material: "wood",    color: "natural", hasArmrests: false } },
  { sku: "CHR-CROSSBACK",  slug: "resin-crossback",     name: "Resin Crossback Chair",        blurb: "Our most-rented event chair.",        categorySlug: "chair", subcategory: "Chairs", flatPrice: 13,  qty: 280, size: "36\" H",  capacity: "per chair", sortOrder: 2, spec: { kind: "chair", material: "resin",   color: "natural", hasArmrests: false } },
  { sku: "CHR-WHITE-RESIN",slug: "white-resin-folding", name: "White Resin Folding Chair",    blurb: "Premium white resin folding.",        categorySlug: "chair", subcategory: "Chairs", flatPrice: 4.5, qty: 320, size: "32\" H",  capacity: "per chair", sortOrder: 3, spec: { kind: "chair", material: "resin",   color: "white",   hasArmrests: false } },
  { sku: "CHR-WHITE-PLAS", slug: "white-garden-folding",name: "White Garden Folding Chair",   blurb: "Classic budget-friendly folding chair.", categorySlug: "chair", subcategory: "Chairs", flatPrice: 2,   qty: 500, size: "32\" H",  capacity: "per chair", sortOrder: 4, spec: { kind: "chair", material: "plastic", color: "white",   hasArmrests: false } },

  // ── Catering ──
  { sku: "CAT-CHAFING",    slug: "chafing-dish",       name: "Chafing Dish (Base + Lid + Sterno)", blurb: "Full-pan chafing setup.",       categorySlug: "catering", subcategory: "Catering", flatPrice: 13, qty: 24, size: "full pan", capacity: "full pan", sortOrder: 1, spec: { kind: "catering", equipmentType: "chafing",     includesLid: true } },
  { sku: "CAT-HOTWATER-5G",slug: "hot-water-5g",       name: "Hot Water Dispenser — 5 Gallon",     blurb: "Insulated 5-gal hot water dispenser.", categorySlug: "catering", subcategory: "Catering", flatPrice: 35, qty: 8,  size: "5 gal",    capacity: "5 gal",     sortOrder: 2, spec: { kind: "catering", equipmentType: "dispenser",  capacityLiters: 18.9 } },

  // ── Linens (live in 'linen' category) ──
  { sku: "LIN-RD-72",      slug: "72-round-linen",     name: "72\" Round Linen",   blurb: "Mid-drop round linen for 48\" tables.",         categorySlug: "linen", subcategory: "Linens", flatPrice: 13,   qty: 60,  size: "72\" Ø",   capacity: "fits 48\" rd", sortOrder: 1,  spec: { kind: "linen", linType: "round",  widthIn: 72 } },
  { sku: "LIN-RD-90",      slug: "90-round-linen",     name: "90\" Round Linen",   blurb: "Lap-length linen for 60\" rounds.",             categorySlug: "linen", subcategory: "Linens", flatPrice: 13,   qty: 60,  size: "90\" Ø",   capacity: "fits 60\" rd", sortOrder: 2,  spec: { kind: "linen", linType: "round",  widthIn: 90 } },
  { sku: "LIN-RD-108",     slug: "108-round-linen",    name: "108\" Round Linen",  blurb: "Floor-length round for 48\" or mid for 60\".",  categorySlug: "linen", subcategory: "Linens", flatPrice: 14,   qty: 80,  size: "108\" Ø",  capacity: "fits 48-60\"", sortOrder: 3,  spec: { kind: "linen", linType: "round",  widthIn: 108 } },
  { sku: "LIN-RD-120",     slug: "120-round-linen",    name: "120\" Round Linen",  blurb: "Floor-length linen for 60\" rounds.",            categorySlug: "linen", subcategory: "Linens", flatPrice: 15,   qty: 80,  size: "120\" Ø",  capacity: "fits 60\" rd", sortOrder: 4,  spec: { kind: "linen", linType: "round",  widthIn: 120 } },
  { sku: "LIN-BQ-60x108",  slug: "60x108-banquet-linen",name: "60\"×108\" Banquet Linen", blurb: "Mid-drop banquet linen for 6' tables.",    categorySlug: "linen", subcategory: "Linens", flatPrice: 13,   qty: 60,  size: "60\" × 108\"", capacity: "fits 6'",      sortOrder: 5,  spec: { kind: "linen", linType: "banquet", widthIn: 60,  lengthIn: 108 } },
  { sku: "LIN-BQ-60x120",  slug: "60x120-banquet-linen",name: "60\"×120\" Banquet Linen", blurb: "Floor-length linen for 6' tables.",        categorySlug: "linen", subcategory: "Linens", flatPrice: 13.5, qty: 60,  size: "60\" × 120\"", capacity: "fits 6'",      sortOrder: 6,  spec: { kind: "linen", linType: "banquet", widthIn: 60,  lengthIn: 120 } },
  { sku: "LIN-BQ-72x144",  slug: "72x144-banquet-linen",name: "72\"×144\" Banquet Linen", blurb: "Floor-length linen for 8' tables.",        categorySlug: "linen", subcategory: "Linens", flatPrice: 15,   qty: 40,  size: "72\" × 144\"", capacity: "fits 8'",      sortOrder: 7,  spec: { kind: "linen", linType: "banquet", widthIn: 72,  lengthIn: 144 } },
  { sku: "LIN-BQ-90x108",  slug: "90x108-banquet-linen",name: "90\"×108\" Banquet Linen", blurb: "Extended-drop linen for 6' tables.",      categorySlug: "linen", subcategory: "Linens", flatPrice: 17,   qty: 40,  size: "90\" × 108\"", capacity: "fits 6'",      sortOrder: 8,  spec: { kind: "linen", linType: "banquet", widthIn: 90,  lengthIn: 108 } },
  { sku: "LIN-BQ-90x132",  slug: "90x132-banquet-linen",name: "90\"×132\" Banquet Linen", blurb: "Long extended-drop banquet linen.",       categorySlug: "linen", subcategory: "Linens", flatPrice: 20,   qty: 30,  size: "90\" × 132\"", capacity: "fits 8'",      sortOrder: 9,  spec: { kind: "linen", linType: "banquet", widthIn: 90,  lengthIn: 132 } },
  { sku: "LIN-BQ-90x156",  slug: "90x156-banquet-linen",name: "90\"×156\" Banquet Linen", blurb: "Max-drop floor-length linen for 8'.",     categorySlug: "linen", subcategory: "Linens", flatPrice: 24,   qty: 30,  size: "90\" × 156\"", capacity: "fits 8'",      sortOrder: 10, spec: { kind: "linen", linType: "banquet", widthIn: 90,  lengthIn: 156 } },
  { sku: "LIN-NAPKIN",     slug: "cloth-napkin",       name: "Cloth Napkin",         blurb: "Premium cotton napkin. Choice of color.", categorySlug: "linen", subcategory: "Linens", flatPrice: 1.2,  qty: 600, size: "20\" sq",     capacity: "per napkin", sortOrder: 11, spec: { kind: "linen", linType: "napkin", widthIn: 20, lengthIn: 20 } },
  { sku: "LIN-RUNNER",     slug: "table-runner",       name: "Table Runner",         blurb: "Decorative runner for banquet tables.",   categorySlug: "linen", subcategory: "Linens", flatPrice: 4.5,  qty: 100, size: "12\" × 108\"", capacity: "per runner", sortOrder: 12, spec: { kind: "linen", linType: "runner", widthIn: 12, lengthIn: 108 } },
  { sku: "LIN-SASH",       slug: "chair-sash",         name: "Chair Sash",            blurb: "Tie-on chair sash, dozens of colors.",   categorySlug: "linen", subcategory: "Linens", flatPrice: 1.2,  qty: 400, size: "6\" × 108\"",  capacity: "per chair",  sortOrder: 13, spec: { kind: "linen", linType: "sash",   widthIn: 6,  lengthIn: 108 } },

  // ── Dance Floors ──
  { sku: "FLR-12x12", slug: "12x12-dance-floor", name: "12'×12' Dance Floor", blurb: "Snap-together parquet. Fits ~30 dancers.",  categorySlug: "floor", subcategory: "Dance Floors", flatPrice: 500, qty: 4, size: "12' × 12'", capacity: "30 dancers", sortOrder: 1, spec: { kind: "floor", widthFt: 12, lengthFt: 12, material: "parquet" } },
  { sku: "FLR-15x15", slug: "15x15-dance-floor", name: "15'×15' Dance Floor", blurb: "Mid-size parquet. Fits ~45 dancers.",        categorySlug: "floor", subcategory: "Dance Floors", flatPrice: 675, qty: 3, size: "15' × 15'", capacity: "45 dancers", sortOrder: 2, spec: { kind: "floor", widthFt: 15, lengthFt: 15, material: "parquet" } },
  { sku: "FLR-15x18", slug: "15x18-dance-floor", name: "15'×18' Dance Floor", blurb: "Rectangular floor. Fits ~54 dancers.",       categorySlug: "floor", subcategory: "Dance Floors", flatPrice: 810, qty: 2, size: "15' × 18'", capacity: "54 dancers", sortOrder: 3, spec: { kind: "floor", widthFt: 15, lengthFt: 18, material: "parquet" } },
  { sku: "FLR-18x18", slug: "18x18-dance-floor", name: "18'×18' Dance Floor", blurb: "Large square floor. Fits ~64 dancers.",     categorySlug: "floor", subcategory: "Dance Floors", flatPrice: 972, qty: 2, size: "18' × 18'", capacity: "64 dancers", sortOrder: 4, spec: { kind: "floor", widthFt: 18, lengthFt: 18, material: "parquet" } },
  { sku: "FLR-9x18",  slug: "9x18-dance-floor",  name: "9'×18' Dance Floor",  blurb: "Long narrow floor for tight venues.",       categorySlug: "floor", subcategory: "Dance Floors", flatPrice: 486, qty: 3, size: "9' × 18'",  capacity: "30 dancers", sortOrder: 5, spec: { kind: "floor", widthFt: 9,  lengthFt: 18, material: "parquet" } },

  // ── Decorations (serialized) ──
  { sku: "DECO-GREENERY",  slug: "greenery-wall",   name: "Greenery Wall 4'x8'",  blurb: "Lush boxwood-style backdrop.",            categorySlug: "decoration", subcategory: "Backdrops", flatPrice: 150, qty: null, size: "4' × 8'", capacity: "photo backdrop", sortOrder: 1, spec: { kind: "decoration", decType: "Greenery Wall", widthIn: 48, heightIn: 96 } },
  { sku: "DECO-NEON",      slug: "neon-sign",       name: "Custom Neon Sign",     blurb: "Custom-bent LED neon. 2-week lead.",     categorySlug: "decoration", subcategory: "Backdrops", flatPrice: 150, qty: null, size: "up to 4'", capacity: "photo moment",   sortOrder: 2, spec: { kind: "decoration", decType: "Neon Sign" } },
  { sku: "DECO-ARCH",      slug: "wedding-arch",    name: "Wedding Arch",         blurb: "Hand-built wooden ceremony arch.",        categorySlug: "decoration", subcategory: "Backdrops", flatPrice: 100, qty: null, size: "8' × 7'",  capacity: "ceremony",       sortOrder: 3, spec: { kind: "decoration", decType: "Arch", widthIn: 84, heightIn: 96 } },
  { sku: "DECO-PEACOCK",   slug: "peacock-chair",   name: "Peacock Chair",        blurb: "Statement peacock rattan chair.",         categorySlug: "decoration", subcategory: "Props",      flatPrice: 125, qty: null, size: "60\" H",   capacity: "photo seat",     sortOrder: 4, spec: { kind: "decoration", decType: "Peacock Chair", heightIn: 60 } },
  { sku: "DECO-BARREL",    slug: "wine-barrel",     name: "Wine Barrel",          blurb: "Reclaimed wine barrel.",                  categorySlug: "decoration", subcategory: "Props",      flatPrice: 65,  qty: null, size: "36\" H",   capacity: "cocktail base",  sortOrder: 5, spec: { kind: "decoration", decType: "Barrel", heightIn: 36 } },

  // ── Heater (patio) ──
  { sku: "HEAT-PATIO",     slug: "patio-heater",    name: "Patio Heater",         blurb: "Propane standing patio heater.",          categorySlug: "heater", subcategory: "Comfort", flatPrice: 105, qty: null, size: "7' H", capacity: "outdoor", sortOrder: 3, spec: { kind: "heater", heaterType: "heater", fuelType: "propane" } },
]

// =============================================================================
// SEED FUNCTION
// =============================================================================
export async function seedRentalInventory(prisma: PrismaClient) {
  console.log("\n▸ Seeding rental inventory…")

  // ---- 0. OrderState consumesInventory flags ------------------------------
  // Set true on every OrderState with sortOrder >= 2 (per business rule:
  // inventory consumed once order is "In Progress" / deposit received).
  // Admin can override per-state via UI later (Settings > Order States).
  const stateUpdates = await prisma.orderState.updateMany({
    where: { sortOrder: { gte: 2 } },
    data: { consumesInventory: true },
  })
  console.log(`  · OrderState.consumesInventory set on ${stateUpdates.count} states (sortOrder ≥ 2)`)

  // ---- 1. Categories ------------------------------------------------------
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { ...c },
      update: { name: c.name, isSerialized: c.isSerialized, sortOrder: c.sortOrder },
    })
  }
  const categoriesBySlug = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id]),
  )
  console.log(`  · ${CATEGORIES.length} categories upserted`)

  // ---- 2. Tent parts ------------------------------------------------------
  for (const p of TENT_PARTS) {
    await prisma.tentPart.upsert({
      where: { name: p.name },
      create: { name: p.name, partType: p.partType, isSerialized: p.isSerialized ?? false, qty: p.qty ?? null },
      // Do NOT reset qty on update — admins enter these through the UI and we must not clobber them.
      update: { partType: p.partType, isSerialized: p.isSerialized ?? false },
    })
  }
  const partsByName = Object.fromEntries(
    (await prisma.tentPart.findMany()).map((p) => [p.name, p.id]),
  )
  console.log(`  · ${TENT_PARTS.length} tent parts upserted`)

  // ---- 3. Tent configurations --------------------------------------------
  for (const c of TENT_CONFIGS) {
    await prisma.tentConfiguration.upsert({
      where: { slug: c.slug },
      create: { ...c, flatPrice: c.flatPrice as any },
      update: { name: c.name, flatPrice: c.flatPrice as any, bomComplete: c.bomComplete, capacity: c.capacity, sortOrder: c.sortOrder },
    })
  }
  const configsBySlug = Object.fromEntries(
    (await prisma.tentConfiguration.findMany()).map((c) => [c.slug, c.id]),
  )
  console.log(`  · ${TENT_CONFIGS.length} tent configurations upserted`)

  // ---- 4. BOMs for the 7 confirmed configs --------------------------------
  let bomRows = 0
  for (const [slug, bom] of Object.entries(BOMS)) {
    const configId = configsBySlug[slug]
    if (!configId) continue
    // wipe + reinsert in a transaction so BOM is never partially written
    const rows: { tentConfigId: number; tentPartId: number; qtyRequired: number }[] = []
    for (const row of bom) {
      const partId = partsByName[row.partName]
      if (!partId) {
        console.warn(`    ! Missing part: ${row.partName}`)
        continue
      }
      rows.push({ tentConfigId: configId, tentPartId: partId, qtyRequired: row.qty })
    }
    await prisma.$transaction(async (tx) => {
      await tx.tentConfigPart.deleteMany({ where: { tentConfigId: configId } })
      for (const row of rows) {
        await tx.tentConfigPart.create({ data: row })
      }
    })
    bomRows += rows.length
  }
  console.log(`  · ${bomRows} BOM rows inserted across ${Object.keys(BOMS).length} configs`)

  // ---- 5. Items + specs ---------------------------------------------------
  for (const item of ITEMS) {
    const categoryId = categoriesBySlug[item.categorySlug]
    if (!categoryId) {
      console.warn(`    ! Missing category for item ${item.sku}: ${item.categorySlug}`)
      continue
    }
    const upserted = await prisma.item.upsert({
      where: { sku: item.sku },
      create: {
        sku: item.sku, slug: item.slug, name: item.name, blurb: item.blurb,
        categoryId, subcategory: item.subcategory,
        flatPrice: item.flatPrice as any, qty: item.qty,
        size: item.size, capacity: item.capacity,
        pricingMode: item.pricingMode ?? "per_day",
        pricingNote: item.pricingNote ?? null,
        sortOrder: item.sortOrder ?? 0,
      },
      update: {
        slug: item.slug, name: item.name, blurb: item.blurb,
        categoryId, subcategory: item.subcategory,
        flatPrice: item.flatPrice as any, qty: item.qty,
        size: item.size, capacity: item.capacity,
        pricingMode: item.pricingMode ?? "per_day",
        pricingNote: item.pricingNote ?? null,
        sortOrder: item.sortOrder ?? 0,
      },
    })
    // Spec
    if (item.spec) {
      const itemId = upserted.id
      switch (item.spec.kind) {
        case "tent":
          await prisma.tentSpec.upsert({ where: { itemId }, create: { itemId, widthFt: item.spec.widthFt, lengthFt: item.spec.lengthFt, style: item.spec.style }, update: { widthFt: item.spec.widthFt, lengthFt: item.spec.lengthFt, style: item.spec.style } })
          break
        case "chair":
          await prisma.chairSpec.upsert({ where: { itemId }, create: { itemId, material: item.spec.material, color: item.spec.color, hasArmrests: item.spec.hasArmrests }, update: { material: item.spec.material, color: item.spec.color, hasArmrests: item.spec.hasArmrests } })
          break
        case "table":
          await prisma.tableSpec.upsert({ where: { itemId }, create: { itemId, shape: item.spec.shape, widthIn: item.spec.widthIn, lengthIn: item.spec.lengthIn }, update: { shape: item.spec.shape, widthIn: item.spec.widthIn, lengthIn: item.spec.lengthIn } })
          break
        case "linen":
          await prisma.linenSpec.upsert({ where: { itemId }, create: { itemId, linType: item.spec.linType, widthIn: item.spec.widthIn, lengthIn: item.spec.lengthIn }, update: { linType: item.spec.linType, widthIn: item.spec.widthIn, lengthIn: item.spec.lengthIn } })
          break
        case "decoration":
          await prisma.decorationSpec.upsert({ where: { itemId }, create: { itemId, decType: item.spec.decType, widthIn: item.spec.widthIn, heightIn: item.spec.heightIn }, update: { decType: item.spec.decType, widthIn: item.spec.widthIn, heightIn: item.spec.heightIn } })
          break
        case "heater":
          await prisma.heaterSpec.upsert({ where: { itemId }, create: { itemId, heaterType: item.spec.heaterType, fuelType: item.spec.fuelType, btu: item.spec.btu }, update: { heaterType: item.spec.heaterType, fuelType: item.spec.fuelType, btu: item.spec.btu } })
          break
        case "floor":
          await prisma.floorSpec.upsert({ where: { itemId }, create: { itemId, widthFt: item.spec.widthFt, lengthFt: item.spec.lengthFt, material: item.spec.material }, update: { widthFt: item.spec.widthFt, lengthFt: item.spec.lengthFt, material: item.spec.material } })
          break
        case "catering":
          await prisma.cateringSpec.upsert({ where: { itemId }, create: { itemId, equipmentType: item.spec.equipmentType, capacityLiters: item.spec.capacityLiters as any, includesLid: item.spec.includesLid }, update: { equipmentType: item.spec.equipmentType, capacityLiters: item.spec.capacityLiters as any, includesLid: item.spec.includesLid } })
          break
        case "lighting":
          await prisma.lightingSpec.upsert({ where: { itemId }, create: { itemId, lightType: item.spec.lightType, pricePerFoot: item.spec.pricePerFoot as any, minFeet: item.spec.minFeet }, update: { lightType: item.spec.lightType, pricePerFoot: item.spec.pricePerFoot as any, minFeet: item.spec.minFeet } })
          break
      }
    }
  }
  console.log(`  · ${ITEMS.length} items + specs upserted`)

  console.log("▸ Rental inventory seed complete.\n")
}
