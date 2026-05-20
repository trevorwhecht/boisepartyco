// GET ?itemIds=1,2,3&configIds=4,5&from=YYYY-MM-DD&to=YYYY-MM-DD
import { NextResponse } from "next/server"
import { getBulkItemAvailability, getBulkTentConfigAvailability } from "@/services/inventoryService"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemIdsStr = searchParams.get("itemIds") ?? ""
  const configIdsStr = searchParams.get("configIds") ?? ""
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  if (!fromStr || !toStr) {
    return NextResponse.json({ data: null, error: "from and to are required" }, { status: 400 })
  }

  const from = new Date(fromStr)
  const to = new Date(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ data: null, error: "Invalid date range" }, { status: 400 })
  }

  const itemIds = itemIdsStr
    ? itemIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []
  const configIds = configIdsStr
    ? configIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []

  const [itemAvailMap, configAvailMap] = await Promise.all([
    itemIds.length
      ? getBulkItemAvailability(itemIds, from, to)
      : Promise.resolve(new Map<number, any>()),
    configIds.length
      ? getBulkTentConfigAvailability(configIds, from, to)
      : Promise.resolve(new Map<number, any>()),
  ])

  return NextResponse.json({
    data: {
      items: Object.fromEntries(itemAvailMap),
      configs: Object.fromEntries(configAvailMap),
    },
    error: null,
  })
}
