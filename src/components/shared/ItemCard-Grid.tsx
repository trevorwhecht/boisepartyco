"use client"
import Image from "next/image"
import { Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import AvailabilityCalendarPopover from "@/components/shared/AvailabilityCalendarPopover"
import QtyStepper from "@/components/shared/QtyStepper"
import { ITEM_IMAGES } from "@/lib/item-images"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
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
  const mode = useInventoryMode()
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? avail.available + (cartLine?.qty ?? 0) : (item.qty ?? 99)
  const imgSrc = ITEM_IMAGES[item.slug] ?? null

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      {/* Image — no longer a link */}
      <div className="aspect-4/3 relative bg-(--shop-paper)">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-sm p-2 text-center">
            {item.name}
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2">
          <h3 className="serif text-xl md:text-2xl font-medium leading-tight text-(--shop-ink)">
            {item.name}
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
          <p className="text-sm text-(--shop-ink-soft) mt-3 mb-4 leading-relaxed flex-1 hidden sm:block">{item.blurb}</p>
        ) : <div className="flex-1" />}

        {mode === "off" ? (
          <div className="mt-2">
            <a href="/contact" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-(--shop-blue) text-white">
              Contact Us
            </a>
          </div>
        ) : (
          <div className="mt-2">
            {/* Availability row */}
            <div className="flex items-center gap-2 mb-2">
              <AvailabilityBadge available={avail.available} stock={avail.stock} hasRange={hasRange} />
              <AvailabilityCalendarPopover itemId={item.id} name={item.name} />
            </div>
            {/* Add / stepper row */}
            <div className="flex justify-end">
              {cartLine ? (
                <QtyStepper compact value={cartLine.qty} min={1} max={maxQty} onChange={(q) => onUpdate(item.id, q)} />
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
        )}
      </div>
    </div>
  )
}
