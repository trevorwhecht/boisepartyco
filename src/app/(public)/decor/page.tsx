import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import CategoryListing from "@/components/shared/CategoryListing"
import CategoryHero from "@/components/shared/layout/CategoryHero"
import type { ItemSummary, AvailabilityResult } from "@/models/inventory"
import { getInventoryMode } from "@/lib/settings"

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

  const mode = await getInventoryMode()

  const items = await prisma.item.findMany({
    where: { category: { slug: { in: ["decoration", "floor", "heater", "lighting", "linen"] } }, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true, slug: true, name: true, blurb: true, flatPrice: true,
      qty: true, subcategory: true, size: true, primaryImageUrl: true,
      category: { select: { slug: true, name: true } },
    },
  })

  const itemsWithAvail = await Promise.all(
    items.map(async (item) => ({
      item: { ...item, flatPrice: Number(item.flatPrice) } as unknown as ItemSummary,
      avail: mode === "off"
        ? ({ available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false } satisfies AvailabilityResult)
        : mode === "fully_in_stock"
        ? ({ available: 9999, booked: 0, stock: 9999, isLow: false, hasConflicts: false } satisfies AvailabilityResult)
        : hasRange
        ? (await getItemAvailability(item.id, from!, to!)) as AvailabilityResult
        : { available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false } satisfies AvailabilityResult,
    })),
  )

  return (
    <main>
      {/* Desktop: full photo hero */}
      <CategoryHero
        title="Decor & Dance Floor"
        subtitle="Dance floors, bistro lights, arches, linens, heaters — the finishing layers that make the photos."
        imgSrc="/images/heroes/decor-hero.webp"
        breadcrumb="Decor & Dance Floor"
      />
      {/* Mobile: simple text header (hero hidden on mobile) */}
      <section className="md:hidden py-8 pb-5 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4">
          <p className="text-xs text-(--shop-ink-soft) mb-2">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Decor &amp; Dance Floor</span>
          </p>
          <h1 className="serif font-medium leading-tight" style={{ fontSize: "clamp(28px, 8vw, 48px)" }}>Decor &amp; Dance Floor</h1>
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
