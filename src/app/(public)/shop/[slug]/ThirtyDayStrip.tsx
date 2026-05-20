"use client"
import { useRouter, useSearchParams } from "next/navigation"

type DayData = { date: string; available: number; total: number }

export default function ThirtyDayStrip({ days }: { days: DayData[] }) {
  const router = useRouter()
  const params = useSearchParams()

  const pick = (date: string) => {
    const next = new URLSearchParams(params.toString())
    next.set("from", date)
    next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  return (
    <div>
      <div className="flex gap-3.5 text-xs text-(--shop-ink-soft) mb-2.5 uppercase tracking-[0.08em]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#e7f4ec] border border-[#2f7d52]" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#fdf3e2] border border-[#d99a3a]" /> Limited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-[#fbeae6] border border-[#c0613a]" /> Booked
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map(day => {
          const pct = day.total > 0 ? day.available / day.total : 1
          let bg = "#e7f4ec", border = "#c3e0cd"
          if (day.available <= 0) { bg = "#fbeae6"; border = "#f3c8bc" }
          else if (pct <= 0.2) { bg = "#fdf3e2"; border = "#f5dfae" }
          const d = new Date(day.date)
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <button key={day.date}
              onClick={() => pick(day.date)}
              title={`${d.toLocaleDateString()} — ${day.available} of ${day.total} available`}
              className="rounded text-center cursor-pointer"
              style={{ background: bg, border: `1px solid ${border}`, padding: "7px 2px" }}>
              <div className="text-[9px] uppercase opacity-60 font-medium" style={{ fontWeight: isWeekend ? 700 : 500 }}>
                {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
              </div>
              <div className="text-[13px] font-semibold text-(--shop-ink) mt-0.5">{d.getDate()}</div>
              <div className="mono text-[9px] mt-0.5 text-(--shop-ink-soft)">{day.available}/{day.total}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
