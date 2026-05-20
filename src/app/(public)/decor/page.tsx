import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import CategoryListing from "@/components/shared/CategoryListing"
import type { ItemSummary, AvailabilityResult } from "@/models/inventory"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function DecorPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ? new Date(fromParam) : null
  const to = toParam ? new Date(toParam) : null
  const hasRange = !!(from && to)
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined

  const items = await prisma.item.findMany({
    where: { category: { slug: { in: ["decoration", "floor", "heater", "lighting", "linen"] } }, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, subcategory: true, size: true,
      category: { select: { slug: true, name: true } },
    },
  })

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
            <span className="text-(--shop-ink)">Decor &amp; Dance Floor</span>
          </p>
          <div className="flex justify-between items-end gap-8 flex-wrap">
            <div>
              <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Decor &amp; Dance Floor</h1>
              <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
                Dance floors, bistro lights, arches, linens, heaters — the finishing layers that make the photos.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <CategoryListing
          items={itemsWithAvail}
          hasRange={hasRange}
          dateLabel={dateLabel}
        />
      </Suspense>
    </main>
  )
}
