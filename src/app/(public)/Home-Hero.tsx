"use client"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import DateRangeField from "@/components/shared/DateRangeField"
import { parseLocalDate, fmtLocalDate } from "@/lib/availability"

export default function HomeHero() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? parseLocalDate(from) : null
  const end = to ? parseLocalDate(to) : null

  const handleChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", fmtLocalDate(s)); else next.delete("from")
    if (e) next.set("to", fmtLocalDate(e)); else next.delete("to")
    router.replace(`/?${next.toString()}`)
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 480, height: "clamp(480px, 60vw, 640px)" }}>
      {/* Real photo background */}
      <Image
        src="/images/heroes/home-hero.webp"
        alt="Boise Party Co. — event rentals in the Treasure Valley"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Dark gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,18,38,0.20) 0%, rgba(10,18,38,0.58) 65%, rgba(10,18,38,0.78) 100%)",
        }}
      />

      <div className="relative max-w-330 mx-auto px-4 md:px-8 pt-16 md:pt-32 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">
          Boise · Meridian · Eagle · Nampa
        </p>
        <h1
          className="serif font-medium leading-[1.05] tracking-tight max-w-220"
          style={{ fontSize: "clamp(36px, 8vw, 76px)", textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
        >
          Rentals for <em className="italic">every occasion</em><br />in the Treasure Valley.
        </h1>
        <p className="mt-4 md:mt-5 text-base md:text-lg text-white/90 max-w-lg leading-relaxed">
          Tents, tables, dance floors, and the small details. Check live availability for your weekend and reserve in minutes.
        </p>
        <div
          className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:p-2.5 sm:bg-white/95 sm:rounded-full"
          style={{ boxShadow: "0 14px 40px -10px rgba(0,0,0,0.45)" }}
        >
          {/* On mobile: stacked buttons. On sm+: pill with date inside */}
          <div className="sm:hidden flex flex-col gap-2.5 w-full max-w-xs">
            <DateRangeField start={start} end={end} onChange={handleChange} dark />
            <a
              href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              See what&apos;s available <ArrowRight size={14} />
            </a>
          </div>
          <div className="hidden sm:flex items-center gap-3.5">
            <DateRangeField start={start} end={end} onChange={handleChange} />
            <a
              href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              See what&apos;s available <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
