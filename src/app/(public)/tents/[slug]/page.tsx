import { notFound } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getItemDailyAvailability, getTentConfigAvailability } from "@/services/inventoryService"
import TentsListing from "@/app/(public)/tents/TentsListing"
import CategoryHero from "@/components/shared/layout/CategoryHero"
import ShopItemModal from "@/components/shared/modals/ShopItemModal"
import type { TentConfigurationSummary, ConfigAvailabilityResult, ItemSummary, AvailabilityResult } from "@/models/inventory"
import { parseLocalDate } from "@/lib/availability"

export const dynamic = "force-dynamic"

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function TentsItemPage({
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
  const dateLabel = hasRange ? `${fmtDate(from!)} – ${fmtDate(to!)}` : undefined
  const qs = fromParam && toParam ? `?from=${fromParam}&to=${toParam}` : ""

  // Fetch listing + lookup target in parallel
  const [configs, items, config, item] = await Promise.all([
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
    prisma.tentConfiguration.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        widthFt: true, lengthFt: true, capacity: true, bomComplete: true,
      },
    }),
    prisma.item.findFirst({
      where: { slug, isActive: true, category: { slug: "tent" } },
      select: {
        id: true, slug: true, name: true, blurb: true, flatPrice: true,
        qty: true, size: true, subcategory: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ])

  if (!config && !item) notFound()

  // Resolve listing availability + modal data in parallel
  const [configsWithAvail, itemsWithAvail] = await Promise.all([
    Promise.all(
      configs.map(async (c) => ({
        config: { ...c, flatPrice: Number(c.flatPrice) } as TentConfigurationSummary,
        avail: hasRange
          ? (await getTentConfigAvailability(c.id, from!, to!)) as ConfigAvailabilityResult
          : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: c.bomComplete, bottleneckParts: [] } satisfies ConfigAvailabilityResult,
      })),
    ),
    Promise.all(
      items.map(async (i) => ({
        item: { ...i, flatPrice: Number(i.flatPrice) } as unknown as ItemSummary,
        avail: hasRange
          ? (await getItemAvailability(i.id, from!, to!)) as AvailabilityResult
          : { available: 0, booked: 0, stock: i.qty ?? 0, isLow: false, hasConflicts: false } satisfies AvailabilityResult,
      })),
    ),
  ])

  return (
    <main>
      <CategoryHero
        title="Tents"
        subtitle="From backyard 20×20s up to our 40×80 high-peak — every tent includes setup, stakedown, and inspection by an owner."
        imgSrc="/images/heroes/tent-hero.jpg"
        breadcrumb="Tents"
      />
      <section className="md:hidden py-8 pb-5 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4">
          <p className="text-xs text-(--shop-ink-soft) mb-2">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Tents</span>
          </p>
          <h1 className="serif font-medium leading-tight" style={{ fontSize: "clamp(28px, 8vw, 48px)" }}>Tents</h1>
        </div>
      </section>

      <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
        <TentsListing configs={configsWithAvail} items={itemsWithAvail} hasRange={hasRange} dateLabel={dateLabel} />
      </Suspense>

      <ModalForSlug
        slug={slug} config={config} item={item}
        from={from} to={to} hasRange={hasRange} fromParam={fromParam} toParam={toParam} qs={qs}
      />
    </main>
  )
}

// Async sub-component so listing renders immediately while modal data loads
async function ModalForSlug({
  slug, config, item, from, to, hasRange, fromParam, toParam, qs,
}: {
  slug: string
  config: { id: number; slug: string; name: string; blurb: string | null; flatPrice: any; widthFt: number | null; lengthFt: number | null; capacity: string | null; bomComplete: boolean } | null
  item: { id: number; slug: string; name: string; blurb: string | null; flatPrice: any; qty: number | null; size: string | null; subcategory: string | null; category: { slug: string; name: string } } | null
  from: Date | null; to: Date | null; hasRange: boolean
  fromParam?: string; toParam?: string; qs: string
}) {
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

  if (item) {
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

  return null
}
