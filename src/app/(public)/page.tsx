import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import HomeHero from "./Home-Hero"
import HomeBlurb from "./Home-Blurb"
import HomeGalleryCarousel from "./Home-GalleryCarousel"

export const dynamic = "force-dynamic"

const CATEGORIES = [
  {
    slug: "tents",
    href: "/tents",
    label: "Tents",
    blurb: "Frame, pole, and high-peak structures from 20×20 to 40×80.",
    dbSlugs: ["tent"],
    imgSrc: "/images/heroes/tent-hero.jpg",
  },
  {
    slug: "tables-and-chairs",
    href: "/tables-and-chairs",
    label: "Tables & Chairs",
    blurb: "Crossbacks, chiavari, farmhouse, banquet rounds, rectangulars.",
    dbSlugs: ["chair", "table"],
    imgSrc: "/images/heroes/tables-hero.webp",
  },
  {
    slug: "decor",
    href: "/decor",
    label: "Decor & Dance Floor",
    blurb: "Dance floors, bistro lighting, arches, linens, heaters.",
    dbSlugs: ["decoration", "floor", "heater", "lighting", "linen"],
    imgSrc: "/images/heroes/decor-hero.webp",
  },
]

export default async function HomePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { from: _from, to: _to } = await searchParams

  // Category item counts
  const [cats, tentConfigCount] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, _count: { select: { items: true } } },
    }),
    prisma.tentConfiguration.count({ where: { isActive: true } }),
  ])
  const countBySlug = Object.fromEntries(cats.map(c => [c.slug, c._count.items]))
  countBySlug["tent"] = tentConfigCount

  return (
    <main>
      <Suspense fallback={<div style={{ height: 640, background: "#3d4d5d" }} />}>
        <HomeHero />
      </Suspense>

      {/* Categories */}
      <section className="py-12 md:py-20" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-8 md:mb-10 flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-3">
                Shop by category
              </p>
              <h2
                className="serif font-medium tracking-tight leading-tight"
                style={{ fontSize: "clamp(28px, 6vw, 48px)" }}
              >
                Build your event from the ground up.
              </h2>
            </div>
            <p className="max-w-sm text-sm text-(--shop-ink-soft) leading-relaxed hidden md:block">
              Pick a category and your dates. We&apos;ll show you exactly what&apos;s free — no calls, no waiting on a reply.
            </p>
          </div>

          {/* Mobile: single column stack. sm: 2-up. md+: 3-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {CATEGORIES.map(c => {
              const count = c.dbSlugs.reduce((s, k) => s + (countBySlug[k] ?? 0), 0)
              return (
                <Link
                  key={c.slug}
                  href={c.href}
                  className="relative z-1 block bg-white rounded-xl overflow-hidden border border-(--shop-line) hover:-translate-y-1 hover:shadow-xl transition-all duration-200 motion-reduce:transition-none"
                >
                  <div className="aspect-5/3 relative bg-(--shop-paper)">
                    <Image
                      src={c.imgSrc}
                      alt={c.label}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center"
                    />
                  </div>
                  <div className="p-5 md:p-6">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <h3 className="serif text-xl md:text-2xl font-medium">{c.label}</h3>
                      {count > 0 ? (
                        <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest shrink-0 ml-2">
                          {count} items
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4">{c.blurb}</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)">
                      Browse {c.label.toLowerCase()} <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <HomeBlurb />
      <HomeGalleryCarousel />
    </main>
  )
}
