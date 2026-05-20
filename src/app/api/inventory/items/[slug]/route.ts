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
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : null
  const hasRange = !!(from && to && !isNaN(from.getTime()) && !isNaN(to.getTime()))

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.role === "admin"

  const item = await prisma.item.findUnique({
    where: { slug, isActive: true },
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
