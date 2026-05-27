import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getItemDailyAvailability } from "@/services/inventoryService"
import ShopItemModal from "@/components/shared/modals/ShopItemModal"
import { getInventoryMode } from "@/lib/settings"

export const dynamic = "force-dynamic"

const TABLES_SLUGS = ["chair", "table"]

export default async function TablesItemModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { slug } = await params
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ? new Date(fromParam) : null
  const to = toParam ? new Date(toParam) : null
  const hasRange = !!(from && to)

  const mode = await getInventoryMode()

  const item = await prisma.item.findFirst({
    where: { slug, isActive: true, category: { slug: { in: TABLES_SLUGS } } },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, size: true, subcategory: true,
      category: { select: { slug: true, name: true } },
    },
  })

  if (!item) notFound()

  const avail = mode === "off"
    ? { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }
    : mode === "fully_in_stock"
    ? { available: 9999, booked: 0, stock: 9999, isLow: false, hasConflicts: false }
    : hasRange
    ? await getItemAvailability(item.id, from!, to!)
    : { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }

  const strip = await getItemDailyAvailability(item.id, new Date(), 35)

  const qs = fromParam && toParam ? `?from=${fromParam}&to=${toParam}` : ""

  return (
    <ShopItemModal
      kind="item"
      item={{ ...item, flatPrice: Number(item.flatPrice) }}
      avail={avail}
      hasRange={hasRange}
      strip={strip}
      closeHref={`/tables-and-chairs${qs}`}
    />
  )
}
