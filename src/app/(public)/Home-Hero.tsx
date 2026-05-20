"use client"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import DateRangeField from "@/components/shared/DateRangeField"

export default function HomeHero() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null

  const handleChange = ({ start: s, end: e }: { start: Date | null; end: Date | null }) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`/?${next.toString()}`)
  }

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 480, height: "clamp(480px, 60vw, 640px)" }}>
      {/* Tent-interior placeholder backdrop */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, rgba(20,30,50,0.10) 0%, rgba(20,30,50,0.55) 70%, rgba(20,30,50,0.75) 100%), radial-gradient(ellipse at 50% 30%, #d8e3ec 0%, #b4c5d2 35%, #768899 70%, #3d4d5d 100%)",
      }}>
        <svg width="100%" height="100%" viewBox="0 0 1600 640" preserveAspectRatio="none"
          className="absolute inset-0 opacity-30">
          {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
            <line key={i} x1={i*160} y1="0" x2="800" y2="180" stroke="#fff" strokeWidth="1.2"/>
          ))}
          {[...Array(14)].map((_,i) => (
            <g key={i}>
              <line x1={120 + i*100} y1="180" x2={120 + i*100} y2={210 + (i%3)*40} stroke="#fff" strokeWidth="0.8" opacity="0.5"/>
              <circle cx={120 + i*100} cy={210 + (i%3)*40} r="3" fill="#ffe9a8" opacity="0.95"/>
            </g>
          ))}
        </svg>
      </div>

      <div className="relative max-w-[1320px] mx-auto px-4 md:px-8 pt-16 md:pt-32 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">
          Boise · Meridian · Eagle · Nampa
        </p>
        <h1
          className="serif font-medium leading-[1.05] tracking-tight max-w-[880px]"
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
