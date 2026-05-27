// GET ?itemIds=1,2,3&configIds=4,5&from=YYYY-MM-DD&to=YYYY-MM-DD
import { NextResponse } from "next/server"
import { getBulkItemAvailability, getBulkTentConfigAvailability } from "@/services/inventoryService"
import { parseLocalDate } from "@/lib/availability"
import { getInventoryMode } from "@/lib/settings"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const mode = await getInventoryMode()

  // If inventory is off, return empty maps immediately
  if (mode === "off") {
    return NextResponse.json({
      data: { items: {}, configs: {}, mode: "off" },
      error: null,
    })
  }

  const itemIdsStr = searchParams.get("itemIds") ?? ""
  const configIdsStr = searchParams.get("configIds") ?? ""

  const itemIds = itemIdsStr
    ? itemIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []
  const configIds = configIdsStr
    ? configIdsStr.split(",").map(Number).filter((n) => n > 0)
    : []

  // If fully in stock mode, return synthetic data without dates
  if (mode === "fully_in_stock") {
    const availEntry = { available: 9999, stock: 9999, booked: 0, isLow: false, hasConflicts: false }
    const items: Record<string, typeof availEntry> = {}
    const configs: Record<string, typeof availEntry> = {}
    for (const id of itemIds) items[id] = availEntry
    for (const id of configIds) configs[id] = availEntry
    return NextResponse.json({
      data: { items, configs },
      error: null,
    })
  }

  // mode === "on" — normal inventory tracking
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  if (!fromStr || !toStr) {
    return NextResponse.json({ data: null, error: "from and to are required" }, { status: 400 })
  }

  // parseLocalDate creates local midnight — consistent with how startDate/dueDateEnd are stored
  const from = parseLocalDate(fromStr)
  const to = parseLocalDate(toStr)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) {
    return NextResponse.json({ data: null, error: "Invalid date range" }, { status: 400 })
  }

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
