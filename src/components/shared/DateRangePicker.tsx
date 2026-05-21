// src/components/shared/DateRangePicker.tsx
"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addDays, daysBetween, fmtRangeShort } from "@/lib/availability"

export type DateRange = { start: Date | null; end: Date | null }

type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  onClose?: () => void
  anchorRect?: DOMRect | null
  inline?: boolean
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DOW = ["S","M","T","W","T","F","S"]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDate = new Date(year, month, 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: d, inMonth: d.getMonth() === month }
  })
  // Trim trailing rows that are entirely out of month
  while (cells.length > 7 && cells.slice(-7).every(c => !c.inMonth)) {
    cells.splice(-7)
  }
  return cells
}

type MonthViewProps = {
  year: number
  month: number
  start: Date | null
  end: Date | null
  hover: Date | null
  minDate: Date
  onPick: (d: Date) => void
  onHover: (d: Date | null) => void
  onPrev?: () => void
  onNext?: () => void
}

function MonthView({ year, month, start, end, hover, minDate, onPick, onHover, onPrev, onNext }: MonthViewProps) {
  const cells = monthGrid(year, month)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        {onPrev ? (
          <button type="button" onClick={onPrev} aria-label="prev" style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid #e4e7ec", background: "#fff", color: "#4a5666", cursor: "pointer" }}>
            <ChevronLeft size={14} />
          </button>
        ) : <span style={{ width: 28 }} />}
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: "#1a2433" }}>{MONTHS[month]} {year}</div>
        {onNext ? (
          <button type="button" onClick={onNext} aria-label="next" style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid #e4e7ec", background: "#fff", color: "#4a5666", cursor: "pointer" }}>
            <ChevronRight size={14} />
          </button>
        ) : <span style={{ width: 28 }} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ fontSize: 11, textTransform: "uppercase", color: "#90969f", textAlign: "center", padding: "6px 0", letterSpacing: "0.06em", fontWeight: 500 }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c.inMonth) return <div key={i} style={{ height: 36 }} />
          const t = c.date.getTime()
          const disabled = c.date < minDate
          const isStart = !!(start && t === start.getTime())
          const isEnd = !!(end && t === end.getTime())
          const inRange = !!(start && end && c.date > start && c.date < end)
          const inHover = !!(start && !end && hover && c.date > start && c.date <= hover)
          const isEndpoint = isStart || isEnd
          return (
            <div key={i}
              style={{
                height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: disabled ? "default" : "pointer",
                fontSize: 13, position: "relative", userSelect: "none",
                color: isEndpoint ? "#fff" : disabled ? "#d4d8df" : "#1a2433",
                background: isEndpoint ? "#1f6fb2" : inRange ? "#e9f2fa" : inHover ? "#f1f6fb" : "transparent",
                borderRadius: isEndpoint ? 6 : 0,
              }}
              onClick={() => !disabled && onPick(c.date)}
              onMouseEnter={() => !disabled && onHover(c.date)}
              onMouseLeave={() => onHover(null)}
            >
              {c.date.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ start, end, onChange, onClose, anchorRect, inline }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const initial = start ?? today
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [hover, setHover] = useState<Date | null>(null)
  const [picking, setPicking] = useState<"start" | "end">(start && !end ? "end" : "start")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  const nav = (dir: number) => {
    setView((v) => {
      const m = v.month + dir
      if (m < 0) return { year: v.year - 1, month: 11 }
      if (m > 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: m }
    })
  }

  const pick = (d: Date) => {
    if (picking === "start" || (start && d < start)) {
      onChange({ start: d, end: null }); setPicking("end")
    } else {
      onChange({ start, end: d }); setPicking("start"); onClose?.()
    }
  }

  const right = { year: view.month === 11 ? view.year + 1 : view.year, month: (view.month + 1) % 12 }

  const thisWeekend = (() => {
    const d = new Date(today); const dow = d.getDay(); d.setDate(d.getDate() + (dow <= 5 ? 5 - dow : 6)); return d
  })()

  // Position: fixed so it's relative to viewport (works inside sticky/relative ancestors)
  // On mobile: full-width with 8px gutters, anchored near the trigger
  // On desktop: right-aligned to the anchor button, min-width 660px for two months
  const positionStyle: React.CSSProperties = (() => {
    if (!anchorRect) return { top: 80, left: 16, right: 16 }

    if (isMobile) {
      return {
        top: Math.min(anchorRect.bottom + 8, window.innerHeight - 400),
        left: 8,
        right: 8,
      }
    }

    // Desktop: right-align to anchor, clamp to viewport left edge
    const pickerWidth = 660
    const rightEdge = anchorRect.right
    const leftPos = Math.max(16, rightEdge - pickerWidth)
    return {
      top: anchorRect.bottom + 8,
      left: leftPos,
    }
  })()

  return (
    <div
      {...(!inline ? { "data-cal-pop": true } : {})}
      style={inline ? {
        background: "#fff",
        border: "1px solid #e4e7ec",
        borderRadius: 12,
        padding: 18,
      } : {
        position: "fixed",
        ...positionStyle,
        background: "#fff",
        border: "1px solid #e4e7ec",
        borderRadius: 12,
        padding: isMobile ? 14 : 18,
        boxShadow: "0 24px 60px -16px rgba(20,30,50,0.18), 0 2px 8px rgba(0,0,0,0.04)",
        zIndex: 100,
        ...(isMobile ? {} : { minWidth: 660 }),
      }}
    >
      <div style={{ display: "flex", gap: isMobile ? 0 : 28 }}>
        {/* Always show left/current month */}
        <MonthView
          year={view.year}
          month={view.month}
          start={start}
          end={end}
          hover={hover}
          minDate={today}
          onPick={pick}
          onHover={setHover}
          onPrev={() => nav(-1)}
          onNext={isMobile ? () => nav(1) : undefined}
        />
        {/* Second month — desktop only */}
        {!isMobile ? (
          <MonthView
            year={right.year}
            month={right.month}
            start={start}
            end={end}
            hover={hover}
            minDate={today}
            onPick={pick}
            onHover={setHover}
            onNext={() => nav(1)}
          />
        ) : null}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f2f5", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: "#4a5666" }}>
          {start && end ? (
            <><strong style={{ color: "#1a2433" }}>{daysBetween(start, end)}</strong> {daysBetween(start, end) === 1 ? "day" : "days"} · {fmtRangeShort(start, end)}</>
          ) : start ? (
            <>Pick an end date</>
          ) : (
            <>Pick a start date</>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => { onChange({ start: null, end: null }); setPicking("start") }}
            style={{ padding: "7px 14px", background: "transparent", border: "1px solid #e4e7ec", borderRadius: 6, color: "#4a5666", fontSize: 13, cursor: "pointer" }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => { onChange({ start: thisWeekend, end: addDays(thisWeekend, 2) }); setPicking("start"); onClose?.() }}
            style={{ padding: "7px 14px", background: "#f5f7fa", border: "1px solid #e4e7ec", borderRadius: 6, color: "#1a2433", fontSize: 13, cursor: "pointer" }}
          >
            This weekend
          </button>
        </div>
      </div>
    </div>
  )
}
