import { Suspense } from "react"
import Link from "next/link"
import { ArrowRight, Truck, Shield, Calendar, Star } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getItemAvailability } from "@/services/inventoryService"
import HomeHero from "./Home-Hero"

export const dynamic = "force-dynamic"

const FEATURED_SLUGS = ["20x40-frame-tent", "8ft-farmhouse-table", "crossback-chair", "12x12-dance-floor"]

const CATEGORIES = [
  { slug: "tents", href: "/tents", label: "Tents", blurb: "Frame, pole, and high-peak structures from 20×20 to 40×80.", dbSlugs: ["tent"] },
  { slug: "tables-and-chairs", href: "/tables-and-chairs", label: "Tables & Chairs", blurb: "Crossbacks, chiavari, farmhouse, banquet rounds, rectangulars.", dbSlugs: ["chair", "table"] },
  { slug: "decor", href: "/decor", label: "Decor & Dance Floor", blurb: "Dance floors, bistro lighting, arches, linens, heaters.", dbSlugs: ["decoration", "floor", "heater", "lighting", "linen"] },
]

const HOW_IT_WORKS = [
  { n: "01", title: "Pick your dates", body: "Use the calendar at the top of any page. Availability updates instantly." },
  { n: "02", title: "Build your list", body: "Add tents, tables, and the little things. Quantities flag if anything's tight." },
  { n: "03", title: "Lock it in", body: "Send your quote. We confirm within 4 business hours and hold your items." },
  { n: "04", title: "We do the rest", body: "Day-before delivery, day-after pickup, level floor in between." },
]

const WHY_US = [
  { icon: Truck, title: "White-glove delivery", blurb: "Setup and teardown included in every quote. We handle the heavy lifting." },
  { icon: Shield, title: "Backed by a guarantee", blurb: "Every tent goes up the day before and is inspected by an owner." },
  { icon: Calendar, title: "Real-time availability", blurb: "No phone tag. See what's free for your weekend and lock it in." },
  { icon: Star, title: "Locally rated #1", blurb: "Boise Weekly Best of 2023 & 2024 · The Knot Best of Weddings." },
]

export default async function HomePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { from: fromParam, to: toParam } = await searchParams
  const from = fromParam ? new Date(fromParam) : null
  const to = toParam ? new Date(toParam) : null

  // Category item counts
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    select: { slug: true, _count: { select: { items: true } } },
  })
  const countBySlug = Object.fromEntries(cats.map(c => [c.slug, c._count.items]))

  // Featured items — try slugs, fall back to first 4 items
  const featured = await prisma.item.findMany({
    where: { slug: { in: FEATURED_SLUGS }, isActive: true },
    select: { id: true, slug: true, name: true, blurb: true, flatPrice: true, qty: true },
    take: 4,
  })

  // Availability for featured items (only if dates provided)
  const featuredWithAvail = await Promise.all(featured.map(async item => {
    if (!from || !to) return { item, available: null }
    const avail = await getItemAvailability(item.id, from, to)
    return { item, available: avail.available }
  }))

  return (
    <main>
      <Suspense fallback={<div style={{ height: 640, background: "#3d4d5d" }} />}>
        <HomeHero />
      </Suspense>

      {/* Categories */}
      <section className="py-20" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <div className="flex justify-between items-end mb-10 flex-wrap gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-3">Shop by category</p>
              <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: 48 }}>
                Build your event from the ground up.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-(--shop-ink-soft) leading-relaxed">
              Pick a category and your dates. We&apos;ll show you exactly what&apos;s free — no calls, no waiting on a reply.
            </p>
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {CATEGORIES.map(c => (
              <Link key={c.slug} href={c.href}
                className="block bg-white rounded-xl overflow-hidden border border-(--shop-line) hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
                <div className="aspect-[5/3] bg-(--shop-paper)" />
                <div className="p-6">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <h3 className="serif text-2xl font-medium">{c.label}</h3>
                    {(() => { const n = c.dbSlugs.reduce((s, k) => s + (countBySlug[k] ?? 0), 0); return n > 0 ? <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">{n} items</span> : null })()}
                  </div>
                  <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4">{c.blurb}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)">
                    Browse {c.label.toLowerCase()} <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-24">
        <div className="max-w-[1320px] mx-auto px-8 grid gap-20 items-center" style={{ gridTemplateColumns: "1fr 1.1fr" }}>
          <div className="aspect-[4/5] bg-(--shop-paper) rounded-xl relative">
            <div className="absolute -bottom-7 -right-7 w-44 rounded-xl p-5 text-white"
              style={{ background: "var(--shop-blue)" }}>
              <div className="serif font-semibold leading-none" style={{ fontSize: 38 }}>
                4.9<span className="text-2xl opacity-70">/5</span>
              </div>
              <div className="text-xs opacity-90 mt-1">342 reviews · The Knot &amp; Google</div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-4">Why neighbors book us</p>
            <h2 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 54 }}>
              Our party rental services will take your event to the next level.
            </h2>
            <p className="mt-5 text-base text-(--shop-ink-soft) leading-relaxed max-w-xl">
              Family-owned and based in Garden City since 2014. We deliver, set up, level the floor, hang the lights — and come back at the end of the night so you don&apos;t have to.
            </p>
            <div className="mt-9 grid gap-7" style={{ gridTemplateColumns: "1fr 1fr" }}>
              {WHY_US.map(f => (
                <div key={f.title} className="flex gap-3.5">
                  <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-(--shop-blue)"
                    style={{ background: "var(--shop-blue-soft)" }}>
                    <f.icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{f.title}</h4>
                    <p className="mt-1 text-[13px] text-(--shop-ink-soft) leading-snug">{f.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured items */}
      {featuredWithAvail.length > 0 ? (
        <section className="py-10 pb-24 bg-white">
          <div className="max-w-[1320px] mx-auto px-8">
            <div className="flex justify-between items-baseline mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-2">This weekend</p>
                <h2 className="serif font-medium tracking-tight" style={{ fontSize: 44 }}>
                  Most-booked right now
                </h2>
              </div>
              <Link href="/tents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)">
                View all inventory <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {featuredWithAvail.map(({ item, available }) => (
                <Link key={item.id} href={`/shop/${item.slug}`} className="block text-(--shop-ink)">
                  <div className="aspect-square bg-(--shop-paper) rounded-xl mb-3.5" />
                  <div className="flex justify-between items-baseline gap-3">
                    <h4 className="serif text-xl font-medium">{item.name}</h4>
                    <span className="mono text-xs whitespace-nowrap">
                      ${Number(item.flatPrice).toFixed(0)}<span className="text-(--shop-ink-soft)">/day</span>
                    </span>
                  </div>
                  {item.blurb ? (
                    <p className="text-[13px] text-(--shop-ink-soft) mt-1.5 leading-snug">{item.blurb}</p>
                  ) : null}
                  {available !== null ? (
                    <div className="mt-3">
                      <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                        available <= 0 ? "bg-[#fbeae6] text-(--shop-warn)" : "bg-[#e7f4ec] text-(--shop-ok)"
                      }`}>
                        {available <= 0 ? "Fully booked" : `${available} available`}
                      </span>
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* How it works */}
      <section className="py-20" style={{ background: "var(--shop-blue-deep)", color: "#fff" }}>
        <div className="max-w-[1320px] mx-auto px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">How it works</p>
          <h2 className="serif font-medium leading-tight tracking-tight max-w-2xl" style={{ fontSize: 44 }}>
            From &ldquo;we should rent a tent&rdquo; to lights-on in four steps.
          </h2>
          <div className="grid gap-8 mt-12" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {HOW_IT_WORKS.map(s => (
              <div key={s.n}>
                <div className="serif font-light italic opacity-50 mb-1.5" style={{ fontSize: 48 }}>{s.n}</div>
                <h4 className="text-lg font-semibold mb-2">{s.title}</h4>
                <p className="text-sm leading-relaxed text-white/75">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-[900px] mx-auto px-8 text-center">
          <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: 56 }}>
            Picture it under the lights.<br />Let&apos;s make a list.
          </h2>
          <p className="mt-5 text-lg text-(--shop-ink-soft) max-w-xl mx-auto leading-relaxed">
            Tell us your dates and we&apos;ll show you everything available — no commitment, no haggling.
          </p>
          <div className="mt-9 inline-flex gap-3">
            <Link href="/tents"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}>
              Browse inventory <ArrowRight size={14} />
            </Link>
            <Link href="/contact"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold border border-(--shop-line) text-(--shop-ink) bg-white">
              Talk to a human
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
