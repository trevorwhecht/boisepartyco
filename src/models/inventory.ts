// =============================================================================
// Inventory domain types.
// Mirrors the Prisma models in nextjs/prisma/schema.additions.prisma.
// =============================================================================

export type CategorySlug =
  | "tent" | "chair" | "table" | "linen" | "decoration"
  | "floor" | "heater" | "catering" | "lighting"

export type PartType = "panel" | "pole" | "crown" | "hardware"

export type SerializedStatus = "available" | "damaged" | "in_repair" | "decommissioned"

// -----------------------------------------------------------------------------
// Reads
// -----------------------------------------------------------------------------

export type CategoryModel = {
  id: number
  slug: CategorySlug
  name: string
  description: string | null
  isSerialized: boolean
  sortOrder: number
  isActive: boolean
}

export type ItemSummary = {
  id: number
  sku: string
  slug: string
  name: string
  blurb: string | null
  categoryId: number
  category: Pick<CategoryModel, "slug" | "name">
  subcategory: string | null
  flatPrice: number
  qty: number | null
  size: string | null
  capacity: string | null
  isPerFoot: boolean
  pricingNote: string | null
  sortOrder: number
  isActive: boolean
  primaryImageUrl: string | null
}

export type ItemDetail = ItemSummary & {
  description: string | null
  cost: number              // 0 for non-admin (stripped at API)
  images: { id: number; url: string; alt: string | null; sortOrder: number }[]
  spec:
    | { kind: "tent"; widthFt: number; lengthFt: number; style: string | null }
    | { kind: "chair"; material: string | null; color: string | null; hasArmrests: boolean | null }
    | { kind: "table"; shape: string; widthIn: number | null; lengthIn: number | null }
    | { kind: "linen"; linType: string; widthIn: number | null; lengthIn: number | null }
    | { kind: "decoration"; decType: string | null; widthIn: number | null; heightIn: number | null }
    | { kind: "heater"; heaterType: string; fuelType: string | null; btu: number | null }
    | { kind: "floor"; widthFt: number; lengthFt: number; material: string | null }
    | { kind: "catering"; equipmentType: string | null; capacityLiters: number | null; includesLid: boolean | null }
    | { kind: "lighting"; lightType: string; pricePerFoot: number | null; minFeet: number | null }
    | null
}

export type TentConfigurationSummary = {
  id: number
  slug: string
  name: string
  widthFt: number
  lengthFt: number
  flatPrice: number
  blurb: string | null
  capacity: string | null
  sortOrder: number
  isActive: boolean
  bomComplete: boolean
  primaryImageUrl: string | null
}

export type TentConfigurationDetail = TentConfigurationSummary & {
  description: string | null
  cost: number
  bomParts: {
    id: number
    tentPartId: number
    qtyRequired: number
    tentPart: { id: number; name: string; partType: PartType; isSerialized: boolean }
  }[]
}

export type TentPartModel = {
  id: number
  name: string
  partType: PartType
  isSerialized: boolean
  qty: number | null
  isActive: boolean
}

export type SerializedUnitModel = {
  id: number
  itemId: number | null
  tentPartId: number | null
  serialNumber: string
  status: SerializedStatus
  notes: string | null
  damagePhotoUrl: string | null
}

// -----------------------------------------------------------------------------
// Availability
// -----------------------------------------------------------------------------

export type AvailabilityResult = {
  stock: number             // total capacity (qty or count of available serialized units)
  booked: number            // max concurrent qty reserved in [from, to]
  available: number         // stock - booked (clamped >= 0)
  hasConflicts: boolean     // true when booked > stock (overbooked)
  isLow: boolean            // available <= 20% of stock
}

export type ConfigAvailabilityResult = AvailabilityResult & {
  // For a tent config: the limiting part(s) — useful for admin diagnostics
  bottleneckParts: {
    tentPartId: number
    name: string
    stock: number
    booked: number
    qtyRequired: number
    maxBuildable: number
  }[]
  bomComplete: boolean
}

// -----------------------------------------------------------------------------
// Cart / order intent (UI → API)
// -----------------------------------------------------------------------------

export type CartLineKind = "item" | "tentConfig"

export type CartLine = {
  kind: CartLineKind
  refId: number              // Item.id or TentConfiguration.id
  qty: number
  name: string               // display name — captured at add-time to avoid extra fetches
  unitPrice: number          // snapshot — server re-validates
  imageUrl?: string | null   // captured at add-time for display on quote page
  notes?: string | null
}

export type CreateOrderPayload = {
  pickupDate: string         // ISO date — Order.startDate
  dropoffDate: string        // ISO date — Order.dueDateEnd
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
    companyName?: string | null
  }
  shipping?: {
    street: string
    city: string
    state: string
    zipCode: string
  } | null
  lines: CartLine[]
  customerNotes?: string | null
}

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
  flatPrice: number
  isPerFoot: boolean
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
  slug: string
  name: string
  widthFt: number
  lengthFt: number
  flatPrice: number
  primaryImageUrl: string | null
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
    qty: number | null
  }[]
}
