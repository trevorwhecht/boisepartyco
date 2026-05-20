"use client"
import Link from "next/link"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import QtyStepper from "@/components/shared/QtyStepper"
import type { ItemSummary, AvailabilityResult, CartLine } from "@/models/inventory"

type Props = {
  item: ItemSummary
  avail: AvailabilityResult
  hasRange: boolean
  cartLine: CartLine | null
  onAdd: (refId: number, qty: number, name: string, unitPrice: number) => void
  onUpdate: (refId: number, qty: number) => void
}

export default function ItemCardList({ item, avail, hasRange, cartLine, onAdd, onUpdate }: Props) {
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.qty ?? 99)

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-4 grid gap-5 items-center"
      style={{ gridTemplateColumns: "96px 1fr auto auto auto" }}>
      <Link href={`/shop/${item.slug}`}>
        <div className="aspect-[4/3] bg-(--shop-paper) rounded-lg" />
      </Link>
      <div>
        <h3 className="serif text-xl font-medium">
          <Link href={`/shop/${item.slug}`} className="text-(--shop-ink) hover:text-(--shop-blue)">
            {item.name}
          </Link>
        </h3>
        {item.subcategory ? <div className="text-xs text-(--shop-ink-soft) mt-0.5">{item.subcategory}</div> : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-1.5 leading-snug max-w-lg">{item.blurb}</p>
        ) : null}
      </div>
      <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
      <div className="mono text-sm text-right">
        {Number(item.flatPrice) > 0
          ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><div className="text-(--shop-ink-soft) text-xs">per day</div></>
          : <strong className="text-(--shop-blue)">Call</strong>}
      </div>
      {cartLine ? (
        <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
      ) : (
        <button
          disabled={disabled}
          onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add to quote
        </button>
      )}
    </div>
  )
}
