import { prisma } from "@/lib/prisma"

export type InventoryMode = "on" | "off" | "fully_in_stock"

export async function getInventoryMode(): Promise<InventoryMode> {
  const row = await prisma.universalSettings.findUnique({ where: { setting: "inventoryMode" } })
  const v = row?.value
  if (v === "off" || v === "fully_in_stock") return v
  return "on"
}
