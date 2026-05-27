"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Info, AlertTriangle } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
import DateRangeField from "@/components/shared/DateRangeField"
import QtyStepper from "@/components/shared/QtyStepper"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { DateRange } from "@/components/shared/DateRangePicker"
import { parseLocalDate, fmtLocalDate } from "@/lib/availability"

type Props = {
  config: {
    id: number
    name: string
    flatPrice: number
    widthFt: number | null
    lengthFt: number | null
    capacity: string | null
    blurb: string | null
    bomComplete: boolean
  }
  avail: { available: number; booked: number; stock: number; isLow: boolean; hasConflicts: boolean; bomComplete: boolean; bottleneckParts: any[] }
  hasRange: boolean
}

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

export default function ShopItemModalTentConfigBooking({ config, avail, hasRange }: Props) {
  const mode = useInventoryMode()
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? parseLocalDate(from) : null
  const end = to ? parseLocalDate(to) : null
  const days = start && end ? daysBetween(start, end) : 1

  const { lines, addToCart, updateLine } = useCart()
  const cartLine = lines.find(l => l.refId === config.id && l.kind === "tentConfig")
  const [qty, setQty] = useState(cartLine?.qty ?? 1)
  const overbook = hasRange && qty > avail.available
  const price = config.flatPrice

  const handleDateChange = ({ start: s, end: e }: DateRange) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", fmtLocalDate(s)); else next.delete("from")
    if (e) next.set("to", fmtLocalDate(e)); else next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  const subtotal = price * qty * days

  if (mode === "off") {
    return (
      <div className="bg-white border border-(--shop-line) rounded-xl p-6 flex flex-col items-center text-center gap-4">
        <p className="text-sm text-(--shop-ink-soft) leading-relaxed">
          To check availability and reserve this item, get in touch.
        </p>
        <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm text-white" style={{ background: "var(--shop-blue)" }}>
          Contact Us <ArrowRight size={14} />
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-6">
      {!avail.bomComplete ? (
        <div className="mb-4 px-3 py-2.5 rounded-lg text-xs flex gap-2 items-center"
          style={{ background: "#fdf3e2", color: "#a26b1d" }}>
          <AlertTriangle size={14} />
          BOM incomplete — contact us for exact availability before booking.
        </div>
      ) : null}

      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm text-(--shop-ink-soft)">Day rate</span>
        <span className="mono text-lg"><strong>${price.toFixed(0)}</strong></span>
      </div>

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-2.5">Event dates</div>
        <DateRangeField start={start} end={end} onChange={handleDateChange} />
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-ink-soft) mb-1.5">Quantity</div>
          <QtyStepper value={qty} min={1} max={hasRange ? Math.max(1, avail.available) : 99} onChange={setQty} />
        </div>
        <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
      </div>

      {overbook ? (
        <div className="mt-3.5 px-3 py-2.5 rounded-lg text-[12.5px] flex gap-2 items-start"
          style={{ background: "#fbeae6", color: "#c0613a" }}>
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>You've requested {qty} but only {avail.available} are free for these dates. Try fewer, different dates, or message us.</span>
        </div>
      ) : null}

      <div className="border-t border-(--shop-line)/60 mt-4 pt-4 flex justify-between items-center">
        <div>
          <div className="text-sm text-(--shop-ink-soft)">{qty} × ${price.toFixed(0)} × {days} day{days === 1 ? "" : "s"}</div>
          <div className="serif font-semibold leading-none mt-1" style={{ fontSize: 32 }}>${subtotal.toLocaleString()}</div>
        </div>
        <button
          onClick={() => cartLine ? updateLine(config.id, "tentConfig", qty) : addToCart(config.id, "tentConfig", qty, config.name, price)}
          disabled={overbook || qty < 1}
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
          style={{ background: overbook || qty < 1 ? undefined : "var(--shop-blue)" }}>
          {cartLine ? "Update quote" : "Add to quote"} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
