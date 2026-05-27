// src/app/(public)/Home-Hero.tsx
"use client"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Calendar } from "lucide-react"
import { useDatePicker } from "@/contexts/DatePickerContext"
import { parseLocalDate, fmtRangeShort } from "@/lib/availability"

function dateLabel(from: string | null, to: string | null): string {
  const start = from ? parseLocalDate(from) : null
  const end = to ? parseLocalDate(to) : null
  if (start && end) return fmtRangeShort(start, end)
  if (start) return `${fmtRangeShort(start, start).split(",")[0]} – pick end`
  return "Pick event dates"
}

export default function HomeHero() {
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const { openPicker } = useDatePicker()
  const label = dateLabel(from, to)

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 480, height: "clamp(480px, 60vw, 640px)" }}>
      <Image
        src="/images/heroes/home-hero.webp"
        alt="Boise Party Co. — event rentals in the Treasure Valley"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
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
          {/* Mobile: stacked buttons */}
          <div className="sm:hidden flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={openPicker}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", width: "100%",
                touchAction: "manipulation",
              }}
            >
              <Calendar size={14} />
              <span style={{ fontWeight: 500 }}>{label}</span>
            </button>
            <a
              href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              See what&apos;s available <ArrowRight size={14} />
            </a>
          </div>

          {/* Desktop: pill with date inside */}
          <div className="hidden sm:flex items-center gap-3.5">
            <button
              type="button"
              onClick={openPicker}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "14px 22px", borderRadius: 8,
                background: "#fff", border: "1px solid #e4e7ec",
                color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              <Calendar size={16} />
              <span style={{ fontWeight: 500 }}>{label}</span>
            </button>
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
