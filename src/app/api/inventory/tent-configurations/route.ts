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
