// GET /api/inventory/daily-availability?itemId=5
// GET /api/inventory/daily-availability?configId=5
// Returns 60 days of per-day availability starting today.
import { NextResponse } from "next/server"
import { getItemDailyAvailability, getTentConfigDailyAvailability } from "@/services/inventoryService"
import { getInventoryMode } from "@/lib/settings"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemIdStr = searchParams.get("itemId")
    const configIdStr = searchParams.get("configId")

    if (!itemIdStr && !configIdStr) {
      return NextResponse.json({ data: null, error: "itemId or configId required" }, { status: 400 })
    }

    const mode = await getInventoryMode()

    // Off mode: no availability data
    if (mode === "off") {
      return NextResponse.json({ data: { days: [] }, error: null })
    }

    const startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    const days = 60

    // Fully in stock: all days available
    if (mode === "fully_in_stock") {
      const syntheticDays = Array.from({ length: days }, (_, i) => {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        return { date: d.toISOString().slice(0, 10), available: 9999, total: 9999 }
      })
      return NextResponse.json({ data: { days: syntheticDays }, error: null })
    }

    // mode === "on"
    if (itemIdStr) {
      const itemId = parseInt(itemIdStr, 10)
      if (isNaN(itemId)) {
        return NextResponse.json({ data: null, error: "Invalid itemId" }, { status: 400 })
      }
      const result = await getItemDailyAvailability(itemId, startDate, days)
      return NextResponse.json({ data: { days: result }, error: null })
    }

    if (!configIdStr) {
      return NextResponse.json({ data: null, error: "itemId or configId required" }, { status: 400 })
    }
    const configId = parseInt(configIdStr, 10)
    if (isNaN(configId)) {
      return NextResponse.json({ data: null, error: "Invalid configId" }, { status: 400 })
    }
    const result = await getTentConfigDailyAvailability(configId, startDate, days)
    return NextResponse.json({ data: { days: result }, error: null })
  } catch (error) {
    console.error("GET /api/inventory/daily-availability:", error)
    return NextResponse.json({ data: null, error: "Failed to fetch availability" }, { status: 500 })
  }
}
