import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigAvailability } from "@/services/inventoryService"

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

  const config = await prisma.tentConfiguration.findUnique({
    where: { slug, isActive: true },
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
