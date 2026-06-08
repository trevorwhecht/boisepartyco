import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/inventory/images?itemIds=1,2&configIds=3
// Returns { data: { "item-1": url, "tentConfig-3": url } }
// Used by the quote page to backfill imageUrl for cart lines loaded from localStorage.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemIdStr = searchParams.get("itemIds") ?? ""
  const configIdStr = searchParams.get("configIds") ?? ""

  const itemIds = itemIdStr ? itemIdStr.split(",").map(Number).filter(Boolean) : []
  const configIds = configIdStr ? configIdStr.split(",").map(Number).filter(Boolean) : []

  const [items, configs] = await Promise.all([
    itemIds.length > 0
      ? prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, primaryImageUrl: true } })
      : [],
    configIds.length > 0
      ? prisma.tentConfiguration.findMany({ where: { id: { in: configIds } }, select: { id: true, primaryImageUrl: true } })
      : [],
  ])

  const data: Record<string, string | null> = {}
  for (const item of items) data[`item-${item.id}`] = item.primaryImageUrl
  for (const config of configs) data[`tentConfig-${config.id}`] = config.primaryImageUrl

  return NextResponse.json({ data })
}
