import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getTentConfigAvailability } from "@/services/inventoryService"
import TentsListing from "./TentsListing"
import CategoryHero from "@/components/shared/layout/CategoryHero"
import type { TentConfigurationSummary, ConfigAvailabilityResult, ItemSummary, AvailabilityResult } from "@/models/inventory"
import { getInventoryMode } from "@/lib/settings"

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

  const mode = await getInventoryMode()

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
        qty: true, subcategory: true, size: true, primaryImageUrl: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ])

  const configsWithAvail = await Promise.all(
    configs.map(async (c) => ({
      config: { ...c, flatPrice: Number(c.flatPrice) } as TentConfigurationSummary,
      avail: mode === "off"
        ? ({ available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: c.bomComplete, bottleneckParts: [] } satisfies ConfigAvailabilityResult)
        : mode === "fully_in_stock"
        ? ({ available: 9999, booked: 0, stock: 9999, isLow: false, hasConflicts: false, bomComplete: true, bottleneckParts: [] } satisfies ConfigAvailabilityResult)
        : hasRange
        ? (await getTentConfigAvailability(c.id, from!, to!)) as ConfigAvailabilityResult
        : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: c.bomComplete, bottleneckParts: [] } satisfies ConfigAvailabilityResult,
    })),
  )

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
        title="Tents"
        subtitle="From backyard 20×20s up to our 40×80 high-peak — every tent includes setup, stakedown, and inspection by an owner."
        imgSrc="/images/heroes/tent-hero.jpg"
        breadcrumb="Tents"
      />
      {/* Mobile: simple text header (hero hidden on mobile) */}
      <section className="md:hidden py-8 pb-5 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4">
          <p className="text-xs text-(--shop-ink-soft) mb-2">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Tents</span>
          </p>
          <h1 className="serif font-medium leading-tight" style={{ fontSize: "clamp(28px, 8vw, 48px)" }}>Tents</h1>
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
