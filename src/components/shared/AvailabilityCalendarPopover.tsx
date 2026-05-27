"use client"
import { useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useInventoryMode } from "@/contexts/InventoryModeContext"

type DayData = { date: string; available: number; total: number }

type Props =
  | { itemId: number; configId?: never; name: string }
  | { itemId?: never; configId: number; name: string }

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DOW = ["S","M","T","W","T","F","S"]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: d, inMonth: d.getMonth() === month }
  })
  while (cells.length > 7 && cells.slice(-7).every((c) => !c.inMonth)) cells.splice(-7)
  return cells
}

function dayStyle(data: DayData | undefined, isPast: boolean) {
  if (isPast || !data) return { bg: "#f5f7fa", fg: "#c5cad3", border: "#e4e7ec" }
  if (data.available <= 0) return { bg: "#fbeae6", fg: "#c0613a", border: "#f3c8bc" }
  const pct = data.total > 0 ? data.available / data.total : 1
  if (pct <= 0.2) return { bg: "#fdf3e2", fg: "#a26b1d", border: "#f5dfae" }
  return { bg: "#e7f4ec", fg: "#2f7d52", border: "#c3e0cd" }
}

export default function AvailabilityCalendarPopover({ itemId, configId, name }: Props) {
  const mode = useInventoryMode()
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<DayData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })

  // Hide entirely when inventory tracking is off
  if (mode === "off") return null

  const handleOpen = async () => {
    setOpen(true)
    if (days !== null || loading) return
    setLoading(true)
    try {
      const qs = itemId != null ? `itemId=${itemId}` : `configId=${configId}`
      const res = await fetch(`/api/inventory/daily-availability?${qs}`)
      const json = await res.json()
      if (json.data?.days) {
        setDays(json.data.days)
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  const navMonth = (dir: number) =>
    setView((v) => {
      const m = v.month + dir
      if (m < 0) return { year: v.year - 1, month: 11 }
      if (m > 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: m }
    })

  const dayMap = new Map<string, DayData>()
  days?.forEach((d) => dayMap.set(d.date, d))

  const cells = monthGrid(view.year, view.month)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-xs text-(--shop-ink-soft) hover:text-(--shop-ink) hover:bg-(--shop-paper) transition-colors cursor-pointer"
        aria-label={`Check availability calendar for ${name}`}
      >
        <CalendarDays size={13} />
        <span>Dates</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm p-0 bg-(--color-background)">
          <DialogTitle className="sr-only">Availability — {name}</DialogTitle>

          <div className="p-5">
            {/* Header */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--shop-ink-soft)">
                Availability
              </p>
              <h3 className="serif font-medium text-xl mt-0.5 leading-tight">{name}</h3>
            </div>

            {/* Legend */}
            <div className="flex gap-3 text-[11px] text-(--shop-ink-soft) mb-4 flex-wrap">
              {[
                { bg: "#e7f4ec", border: "#c3e0cd", label: "Available" },
                { bg: "#fdf3e2", border: "#f5dfae", label: "Limited" },
                { bg: "#fbeae6", border: "#f3c8bc", label: "Booked" },
              ].map(({ bg, border, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-sm inline-block shrink-0"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  />
                  {label}
                </span>
              ))}
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => navMonth(-1)}
                className="p-1.5 rounded hover:bg-(--shop-paper) text-(--shop-ink-soft) hover:text-(--shop-ink) transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="serif font-medium text-base">
                {MONTH_NAMES[view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={() => navMonth(1)}
                className="p-1.5 rounded hover:bg-(--shop-paper) text-(--shop-ink-soft) hover:text-(--shop-ink) transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Calendar grid */}
            {loading ? (
              <div className="py-10 text-center text-(--shop-ink-soft) text-sm">Loading…</div>
            ) : fetchError ? (
              <div className="py-10 text-center text-(--shop-ink-soft) text-sm">Could not load availability.</div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {DOW.map((d, i) => (
                  <div
                    key={i}
                    className="text-[10px] uppercase text-(--shop-ink-soft) text-center py-1 font-medium tracking-wider"
                  >
                    {d}
                  </div>
                ))}
                {cells.map((c, i) => {
                  if (!c.inMonth) return <div key={i} className="aspect-square" />
                  const dateStr = `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, '0')}-${String(c.date.getDate()).padStart(2, '0')}`
                  const data = dayMap.get(dateStr)
                  const isPast = c.date < today
                  const { bg, fg, border } = dayStyle(data, isPast)
                  return (
                    <div
                      key={i}
                      className="aspect-square flex flex-col items-center justify-center rounded-md"
                      style={{ background: bg, border: `1px solid ${border}`, color: fg }}
                    >
                      <span className="text-[12px] font-semibold leading-none">
                        {c.date.getDate()}
                      </span>
                      {data && !isPast ? (
                        <span className="text-[9px] font-medium mt-0.5 leading-none opacity-80">
                          {data.available}/{data.total}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}

            <p className="mt-4 text-[11px] text-(--shop-ink-soft)">
              Showing next 60 days · counts reflect current bookings
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
