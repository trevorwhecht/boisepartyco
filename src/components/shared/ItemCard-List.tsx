"use client"
import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import QtyStepper from "@/components/shared/QtyStepper"
import { ITEM_IMAGES } from "@/lib/item-images"
import { itemUrl } from "@/lib/item-url"
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
  const imgSrc = ITEM_IMAGES[item.slug] ?? null

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl p-3.5 flex gap-3.5 items-start md:grid md:gap-5 md:items-center md:p-4 md:grid-cols-[96px_1fr_auto_auto_auto]">

      {/* Col 1: Image */}
      <Link href={itemUrl(item.category.slug, item.slug)} className="shrink-0">
        <div className="w-18 md:w-auto aspect-4/3 relative rounded-lg md:rounded-xl overflow-hidden bg-(--shop-paper)">
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 72px, 96px"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-xs p-1 text-center leading-tight">
              {item.name}
            </div>
          )}
        </div>
      </Link>

      {/* Col 2: Name + subcategory + blurb + mobile controls */}
      <div className="flex-1 min-w-0">
        <h3 className="serif text-[1.05rem] md:text-xl font-medium leading-tight">
          <Link href={itemUrl(item.category.slug, item.slug)} className="text-(--shop-ink) hover:text-(--shop-blue)">
            {item.name}
          </Link>
        </h3>
        {item.subcategory ? (
          <div className="text-xs text-(--shop-ink-soft) mt-0.5">{item.subcategory}</div>
        ) : null}
        {item.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) mt-1.5 leading-snug max-w-lg hidden md:block">{item.blurb}</p>
        ) : null}

        {/* Mobile-only: availability + price + add button */}
        <div className="flex items-center gap-2 mt-2.5 md:hidden">
          <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
          <div className="ml-auto mono text-sm whitespace-nowrap">
            {Number(item.flatPrice) > 0
              ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><span className="text-(--shop-ink-soft) text-xs">/day</span></>
              : <strong className="text-(--shop-blue)">Call</strong>}
          </div>
          {cartLine ? (
            <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
          ) : (
            <button
              disabled={disabled}
              onClick={() => onAdd(item.id, 1, item.name, Number(item.flatPrice))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) bg-(--shop-blue) text-white cursor-pointer disabled:cursor-not-allowed"
            >
              <Plus size={11} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Col 3: Availability (desktop only) */}
      <div className="hidden md:flex items-center">
        <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
      </div>

      {/* Col 4: Price (desktop only) */}
      <div className="hidden md:block mono text-sm text-right">
        {Number(item.flatPrice) > 0
          ? <><strong>${Number(item.flatPrice).toFixed(0)}</strong><div className="text-(--shop-ink-soft) text-xs">per day</div></>
          : <strong className="text-(--shop-blue)">Call</strong>}
      </div>

      {/* Col 5: Add button (desktop only) */}
      <div className="hidden md:block">
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
    </div>
  )
}
