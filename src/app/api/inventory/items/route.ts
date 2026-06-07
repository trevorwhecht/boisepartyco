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
      isPerFoot: true,
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
