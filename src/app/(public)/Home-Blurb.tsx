import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function HomeBlurb() {
  return (
    <section className="relative py-16 md:py-24" style={{ background: "var(--shop-paper)" }}>
      {/* Decorative city illustration — bleeds upward into the section above, full width on mobile */}
      <div className="absolute left-0 bottom-0 w-full md:w-[90%] h-[150%] pointer-events-none select-none">
        <Image
          src="/images/heroes/blurb-bg.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 90vw"
          className="object-contain object-bottom-left"
          style={{ opacity: 0.15 }}
          aria-hidden
        />
      </div>

      {/* Content — z-10 so it sits above the illustration */}
      <div className="relative z-10 max-w-330 mx-auto px-4 md:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-4">
            Treasure Valley Event Rentals
          </p>
          <h2
            className="serif font-medium leading-tight tracking-tight mb-6"
            style={{ fontSize: "clamp(26px, 5vw, 44px)" }}
          >
            Get Everything You Need for a Fantastic Event
          </h2>
          <p className="text-base md:text-lg text-(--shop-ink-soft) leading-relaxed mb-4">
            Reach out to our party rental company in Treasure Valley and surrounding areas.
          </p>
          <div className="text-base text-(--shop-ink-soft) leading-relaxed space-y-4 max-w-2xl">
            <p>
              Planning an event takes a lot of work. But you can make hosting the perfect party a little less stressful by turning to Boise Party Co. Our party rental company provides a wide range of party rentals to people in the Treasure Valley and surrounding areas and will help you find everything you need to make sure everything goes smoothly.
            </p>
            <p>
              Whether you&apos;re throwing a birthday party or planning your wedding, we&apos;ll make sure you&apos;re set up for success. Make planning easier when you ask about our party rentals today.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/tents"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              Browse rentals <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold border border-(--shop-line) text-(--shop-ink) bg-white"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
