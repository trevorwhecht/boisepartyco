import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getTentConfigAvailability } from "@/services/inventoryService"
import TentsListing from "./TentsListing"
import type { TentConfigurationSummary, ConfigAvailabilityResult, ItemSummary, AvailabilityResult } from "@/models/inventory"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function TentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ? new Date(fromParam) : null
  const to = toParam ? new Date(toParam) : null
  const hasRange = !!(from && to)
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined

  const [configs, items] = await Promise.all([
    prisma.tentConfiguration.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        widthFt: true, lengthFt: true, capacity: true, bomComplete: true,
        sortOrder: true, isActive: true, primaryImageUrl: true,
      },
    }),
    prisma.item.findMany({
      where: { category: { slug: "tent" }, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        qty: true, subcategory: true, size: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ])

  const configsWithAvail = await Promise.all(
    configs.map(async (c) => ({
      config: { ...c, flatPrice: Number(c.flatPrice) } as TentConfigurationSummary,
      avail: hasRange
        ? (await getTentConfigAvailability(c.id, from!, to!)) as ConfigAvailabilityResult
        : {
            available: 0, booked: 0, stock: 0,
            isLow: false, hasConflicts: false,
            bomComplete: c.bomComplete,
            bottleneckParts: [],
          } satisfies ConfigAvailabilityResult,
    })),
  )

  const itemsWithAvail = await Promise.all(
    items.map(async (item) => ({
      item: { ...item, flatPrice: Number(item.flatPrice) } as unknown as ItemSummary,
      avail: hasRange
        ? (await getItemAvailability(item.id, from!, to!)) as AvailabilityResult
        : {
            available: 0, booked: 0,
            stock: item.qty ?? 0,
            isLow: false, hasConflicts: false,
          } satisfies AvailabilityResult,
    })),
  )

  return (
    <main>
      {/* Page header */}
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="text-(--shop-ink-soft) hover:text-(--shop-ink)">Home</a>
            {" "}/{" "}
            <span className="text-(--shop-ink)">Tents</span>
          </p>
          <div className="flex justify-between items-end gap-8 flex-wrap">
            <div>
              <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Tents</h1>
              <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
                From backyard 20×20s up to our 40×80 high-peak — every tent includes setup, stakedown, and inspection by an owner.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <TentsListing
          configs={configsWithAvail}
          items={itemsWithAvail}
          hasRange={hasRange}
          dateLabel={dateLabel}
        />
      </Suspense>
    </main>
  )
}
