import { notFound } from "next/navigation"
import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability, getTentConfigAvailability, getItemDailyAvailability } from "@/services/inventoryService"
import ItemDetail from "./ItemDetail"
import TentConfigDetail from "./TentConfigDetail"
import ThirtyDayStrip from "./ThirtyDayStrip"

export const dynamic = "force-dynamic"

export default async function ShopDetailPage({
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

  // Try item first
  const item = await prisma.item.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true, slug: true, name: true, blurb: true, description: true,
      flatPrice: true, qty: true, size: true, subcategory: true,
      category: { select: { slug: true, name: true } },
    },
  })

  if (item) {
    const [avail, strip] = await Promise.all([
      hasRange
        ? getItemAvailability(item.id, from!, to!)
        : Promise.resolve({ available: 0, booked: 0, stock: item.qty ?? 0, isLow: false, hasConflicts: false }),
      getItemDailyAvailability(item.id, new Date(), 35),
    ])

    const itemForDetail = {
      id: item.id,
      slug: item.slug,
      name: item.name,
      flatPrice: Number(item.flatPrice ?? 0),
      qty: item.qty,
      category: item.category,
    }

    return (
      <main>
        <section className="pt-10 pb-4" style={{ background: "var(--shop-paper)" }}>
          <div className="max-w-330 mx-auto px-8 text-xs text-(--shop-ink-soft)">
            <a href="/" className="hover:text-(--shop-ink)">Home</a>
            {" / "}
            <a href={`/${item.category.slug}`} className="hover:text-(--shop-ink)">{item.category.name}</a>
            {" / "}
            <span className="text-(--shop-ink)">{item.name}</span>
          </div>
        </section>

        <section className="pb-20" style={{ background: "var(--shop-paper)" }}>
          <div className="max-w-330 mx-auto px-8 pt-6 grid gap-16 items-start"
            style={{ gridTemplateColumns: "1.2fr 1fr" }}>
            {/* Gallery placeholder */}
            <div>
              <div className="aspect-4/3 bg-white border border-(--shop-line) rounded-xl" />
              <div className="grid grid-cols-4 gap-3 mt-3">
                {[0,1,2,3].map(i => (
                  <div key={i} className="aspect-square bg-white border border-(--shop-line) rounded-lg" />
                ))}
              </div>
            </div>

            {/* Details + booking */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-blue) mb-1.5">
                {item.category.name}
              </div>
              <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>
                {item.name}
              </h1>
              {(item.size || item.subcategory) ? (
                <div className="flex gap-4 text-sm text-(--shop-ink-soft) mt-3">
                  {item.size ? <span><strong className="text-(--shop-ink)">{item.size}</strong></span> : null}
                  {item.subcategory ? <><span>·</span><span className="text-(--shop-ink)">{item.subcategory}</span></> : null}
                  <span>·</span>
                  <span><strong className="text-(--shop-ink)">{item.qty ?? "?"}</strong> in inventory</span>
                </div>
              ) : null}
              {item.blurb ? (
                <p className="mt-4 text-base text-(--shop-ink-soft) leading-relaxed">{item.blurb}</p>
              ) : null}

              <div className="mt-7">
                <Suspense fallback={null}>
                  <ItemDetail item={itemForDetail} avail={avail} hasRange={hasRange} />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* 35-day strip */}
        <section className="py-16 border-t border-(--shop-line)">
          <div className="max-w-330 mx-auto px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-2">Next 35 days</p>
            <h3 className="serif font-medium mb-6" style={{ fontSize: 32 }}>
              What this item looks like over the next month
            </h3>
            <Suspense fallback={null}>
              <ThirtyDayStrip days={strip} />
            </Suspense>
          </div>
        </section>
      </main>
    )
  }

  // Try tent configuration
  const config = await prisma.tentConfiguration.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true, slug: true, name: true, blurb: true, description: true,
      flatPrice: true, widthFt: true, lengthFt: true, capacity: true,
      bomComplete: true, isActive: true,
    },
  })

  if (!config) notFound()

  const avail = hasRange
    ? await getTentConfigAvailability(config.id, from!, to!)
    : { available: 0, booked: 0, stock: 0, isLow: false, hasConflicts: false, bomComplete: config.bomComplete, bottleneckParts: [] }

  const configForDetail = {
    id: config.id,
    name: config.name,
    flatPrice: Number(config.flatPrice ?? 0),
    widthFt: config.widthFt,
    lengthFt: config.lengthFt,
    capacity: config.capacity,
    blurb: config.blurb,
    bomComplete: config.bomComplete,
  }

  return (
    <main>
      <section className="pt-10 pb-4" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8 text-xs text-(--shop-ink-soft)">
          <a href="/">Home</a> / <a href="/tents">Tents</a> / <span className="text-(--shop-ink)">{config.name}</span>
        </div>
      </section>

      <section className="pb-20" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8 pt-6 grid gap-16 items-start"
          style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          <div className="aspect-4/3 bg-white border border-(--shop-line) rounded-xl" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-blue) mb-1.5">Tent</div>
            <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>{config.name}</h1>
            {(config.widthFt || config.capacity) ? (
              <div className="flex gap-4 text-sm text-(--shop-ink-soft) mt-3">
                {config.widthFt ? <span><strong className="text-(--shop-ink)">{config.widthFt}×{config.lengthFt} ft</strong></span> : null}
                {config.capacity ? <><span>·</span><span><strong className="text-(--shop-ink)">Up to {config.capacity}</strong></span></> : null}
              </div>
            ) : null}
            {config.blurb ? <p className="mt-4 text-base text-(--shop-ink-soft) leading-relaxed">{config.blurb}</p> : null}
            <div className="mt-7">
              <Suspense fallback={null}>
                <TentConfigDetail config={configForDetail} avail={avail} hasRange={hasRange} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
