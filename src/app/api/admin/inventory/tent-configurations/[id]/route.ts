import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigBuildableCount } from "@/services/inventoryService"

async function buildResponse(id: number) {
  const config = await prisma.tentConfiguration.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true, widthFt: true, lengthFt: true, flatPrice: true, primaryImageUrl: true, isActive: true, bomComplete: true, sortOrder: true },
  })
  if (!config) return null
  const buildable = await getTentConfigBuildableCount(id)
  const { flatPrice: rawFp, ...rest } = config
  return { ...rest, flatPrice: rawFp.toNumber(), ...buildable }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid id" }, { status: 400 })

  const data = await buildResponse(id)
  if (!data) return NextResponse.json({ data: null, error: "Not found" }, { status: 404 })
  return NextResponse.json({ data, error: null })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const { flatPrice, isActive, primaryImageUrl, bomParts } = body

  if (flatPrice !== undefined) {
    if (typeof flatPrice !== "number" || isNaN(flatPrice) || flatPrice < 0) {
      return NextResponse.json({ data: null, error: "flatPrice must be a non-negative number" }, { status: 400 })
    }
  }

  if (bomParts !== undefined) {
    if (!Array.isArray(bomParts)) {
      return NextResponse.json({ data: null, error: "bomParts must be an array" }, { status: 400 })
    }
    for (const entry of bomParts) {
      if (typeof entry.tentPartId !== "number" || typeof entry.qtyRequired !== "number" || !Number.isInteger(entry.qtyRequired) || entry.qtyRequired < 0) {
        return NextResponse.json({ data: null, error: "Each bomPart must have integer tentPartId and non-negative integer qtyRequired" }, { status: 400 })
      }
    }
  }

  if (flatPrice !== undefined || isActive !== undefined || primaryImageUrl !== undefined) {
    await prisma.tentConfiguration.update({
      where: { id },
      data: {
        ...(flatPrice !== undefined ? { flatPrice } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(primaryImageUrl !== undefined ? { primaryImageUrl: primaryImageUrl || null } : {}),
      },
    })
  }

  if (bomParts !== undefined) {
    // Full replace: upsert parts with qty > 0, delete the rest
    const toUpsert = (bomParts as { tentPartId: number; qtyRequired: number }[]).filter(p => p.qtyRequired > 0)
    const toUpsertIds = toUpsert.map(p => p.tentPartId)

    await prisma.tentConfigPart.deleteMany({
      where: { tentConfigId: id, tentPartId: { notIn: toUpsertIds } },
    })

    await Promise.all(
      toUpsert.map(({ tentPartId, qtyRequired }) =>
        prisma.tentConfigPart.upsert({
          where: { tentConfigId_tentPartId: { tentConfigId: id, tentPartId } },
          update: { qtyRequired },
          create: { tentConfigId: id, tentPartId, qtyRequired },
        })
      )
    )

    await prisma.tentConfiguration.update({
      where: { id },
      data: { bomComplete: toUpsertIds.length > 0 },
    })
  }

  const data = await buildResponse(id)
  if (!data) return NextResponse.json({ data: null, error: "Not found" }, { status: 404 })
  return NextResponse.json({ data, error: null })
}
