import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getItemDailyAvailability, getTentConfigAvailability } from "@/services/inventoryService"
import { parseLocalDate } from "@/lib/availability"
import ShopItemModal from "@/components/shared/modals/ShopItemModal"

export const dynamic = "force-dynamic"

export default async function TentsItemModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { slug } = await params
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ? parseLocalDate(fromParam) : null
  const to = toParam ? parseLocalDate(toParam) : null
  const hasRange = !!(from && to)
  const qs = fromParam && toParam ? `?from=${fromParam}&to=${toParam}` : ""

  // Try tent configuration first
  const config = await prisma.tentConfiguration.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      widthFt: true, lengthFt: true, capacity: true, bomComplete: true,
    },
  })

  if (config) {
    const avail = hasRange
      ? await getTentConfigAvailability(config.id, from!, to!)
      : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: config.bomComplete, bottleneckParts: [] }

    return (
      <ShopItemModal
        kind="tentConfig"
        config={{ ...config, flatPrice: Number(config.flatPrice) }}
        avail={avail}
        hasRange={hasRange}
        closeHref={`/tents${qs}`}
      />
    )
  }

  // Fall back to tent accessory item
  const item = await prisma.item.findFirst({
    where: { slug, isActive: true, category: { slug: "tent" } },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, size: true, subcategory: true,
      category: { select: { slug: true, name: true } },
    },
  })

  if (!item) notFound()

  const [avail, strip] = await Promise.all([
    hasRange
      ? getItemAvailability(item.id, from!, to!)
      : Promise.resolve({ available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }),
    getItemDailyAvailability(item.id, new Date(), 35),
  ])

  return (
    <ShopItemModal
      kind="item"
      item={{ ...item, flatPrice: Number(item.flatPrice) }}
      avail={avail}
      hasRange={hasRange}
      strip={strip}
      closeHref={`/tents${qs}`}
    />
  )
}
