"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Info } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import DateRangeField from "@/components/shared/DateRangeField"
import QtyStepper from "@/components/shared/QtyStepper"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { DateRange } from "@/components/shared/DateRangePicker"

type Props = {
  item: {
    id: number
    name: string
    flatPrice: number
    qty: number | null
    slug: string
    category: { slug: string; name: string }
  }
  avail: { available: number; booked: number; stock: number; isLow: boolean; hasConflicts: boolean }
  hasRange: boolean
}

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

export default function ShopItemModalItemBooking({ item, avail, hasRange }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? new Date(from) : null
  const end = to ? new Date(to) : null
  const days = start && end ? daysBetween(start, end) : 1

  const { lines, addToCart, updateLine } = useCart()
  const cartLine = lines.find(l => l.refId === item.id && l.kind === "item")
  const [qty, setQty] = useState(cartLine?.qty ?? 1)
  const overbook = hasRange && qty > avail.available
  const price = item.flatPrice

  const handleDateChange = ({ start: s, end: e }: DateRange) => {
    const next = new URLSearchParams(params.toString())
    if (s) next.set("from", s.toISOString().slice(0, 10)); else next.delete("from")
    if (e) next.set("to", e.toISOString().slice(0, 10)); else next.delete("to")
    router.replace(`?${next.toString()}`)
  }

  const handleAddOrUpdate = () => {
    if (cartLine) {
      updateLine(item.id, "item", qty)
    } else {
      addToCart(item.id, "item", qty, item.name, price)
    }
  }

  const subtotal = price * qty * days

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-6">
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
          <QtyStepper value={qty} min={1} max={item.qty ?? 99} onChange={setQty} />
        </div>
        <div className="text-right">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          {hasRange ? (
            <div className="text-[11px] text-(--shop-ink-soft) mt-1.5">
              Stock: {avail.stock} · Booked: {avail.booked}
            </div>
          ) : null}
        </div>
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
          <div className="serif font-semibold leading-none mt-1" style={{ fontSize: 32 }}>
            ${subtotal.toLocaleString()}
          </div>
        </div>
        <button
          onClick={handleAddOrUpdate}
          disabled={overbook || qty < 1}
          className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
          style={{ background: overbook || qty < 1 ? undefined : "var(--shop-blue)" }}>
          {cartLine ? "Update quote" : "Add to quote"} <ArrowRight size={14} />
        </button>
      </div>

      <p className="mt-5 text-[13px] text-(--shop-ink-soft) leading-relaxed">
        <Info size={12} className="inline mr-1" />
        Reservations are held for 48 hours after we send the quote. Full payment due 14 days before delivery.
      </p>
    </div>
  )
}
