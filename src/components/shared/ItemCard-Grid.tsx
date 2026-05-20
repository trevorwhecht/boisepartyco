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

export default function ItemCardGrid({ item, avail, hasRange, cartLine, onAdd, onUpdate }: Props) {
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.qty ?? 99)

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      <Link href={`/shop/${item.slug}`} className="block">
        <div className="aspect-[4/3] bg-(--shop-paper) flex items-center justify-center text-(--shop-ink-soft) text-sm">
          {item.name}
        </div>
      </Link>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="serif text-2xl font-medium leading-tight">
            <Link href={`/shop/${item.slug}`} className="text-(--shop-ink) hover:text-(--shop-blue)">
              {item.name}
            </Link>
          </h3>
          <span className="mono text-sm whitespace-nowrap">
            {Number(item.flatPrice) > 0
              ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><span className="text-(--shop-ink-soft)">/day</span></>
              : <strong className="text-(--shop-blue)">Call</strong>}
          </span>
        </div>
        {item.subcategory ? (
          <div className="text-xs text-(--shop-ink-soft) mt-1">{item.subcategory}</div>
        ) : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-3 mb-4 leading-relaxed flex-1">{item.blurb}</p>
        ) : <div className="flex-1" />}
        <div className="flex justify-between items-center gap-3 mt-2">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          {cartLine ? (
            <QtyStepper
              compact
              value={cartLine.qty}
              min={1}
              max={maxQty}
              onChange={(q) => onUpdate(item.id, q)}
            />
          ) : (
            <button
              disabled={disabled}
              onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
