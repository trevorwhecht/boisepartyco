"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ITEM_IMAGES } from "@/lib/item-images"
import { TENT_IMAGES } from "@/lib/tent-images"
import ShopItemModalItemBooking from "./ShopItemModal-ItemBooking"
import ShopItemModalTentConfigBooking from "./ShopItemModal-TentConfigBooking"
import ThirtyDayStrip from "@/components/shared/ThirtyDayStrip"
import type { AvailabilityResult, ConfigAvailabilityResult } from "@/models/inventory"

type DayData = { date: string; available: number; total: number }

type ItemData = {
  kind: "item"
  item: {
    id: number; slug: string; name: string; blurb: string | null
    flatPrice: number; qty: number | null; size: string | null
    subcategory: string | null; category: { slug: string; name: string }
  }
  avail: AvailabilityResult
  strip: DayData[]
}

type TentConfigData = {
  kind: "tentConfig"
  config: {
    id: number; slug: string; name: string; blurb: string | null
    flatPrice: number; widthFt: number | null; lengthFt: number | null
    capacity: string | null; bomComplete: boolean
  }
  avail: ConfigAvailabilityResult
}

type Props = (ItemData | TentConfigData) & {
  hasRange: boolean
  closeHref: string
}

export default function ShopItemModal(props: Props) {
  const { hasRange, closeHref } = props
  const router = useRouter()
  const [open, setOpen] = useState(true)
  // Defer dialog open until after hydration — Base UI adds aria-hidden/data-base-ui-inert to
  // elements outside the dialog portal when open, which differs from the SSR HTML and causes a
  // hydration mismatch in dev. Keeping it "closed" for the initial pass prevents that.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const handleClose = () => {
    setOpen(false)
    router.push(closeHref)
  }

  const isItem = props.kind === "item"
  const name = isItem ? props.item.name : props.config.name
  const blurb = isItem ? props.item.blurb : props.config.blurb
  const imgSrc = isItem
    ? (ITEM_IMAGES[props.item.slug] ?? null)
    : (TENT_IMAGES[props.config.slug] ?? null)

  // Category label above name
  const categoryLabel = isItem ? props.item.category.name : "Tent"

  // Specs row
  const specsRow = isItem ? (
    <>
      {props.item.size ? <span><strong className="text-(--shop-ink)">{props.item.size}</strong></span> : null}
      {props.item.subcategory ? <><span>·</span><span className="text-(--shop-ink)">{props.item.subcategory}</span></> : null}
      {props.item.qty != null ? <><span>·</span><span><strong className="text-(--shop-ink)">{props.item.qty}</strong> in inventory</span></> : null}
    </>
  ) : (
    <>
      {props.config.widthFt ? <span><strong className="text-(--shop-ink)">{props.config.widthFt}×{props.config.lengthFt} ft</strong></span> : null}
      {props.config.capacity ? <><span>·</span><span>Up to <strong className="text-(--shop-ink)">{props.config.capacity}</strong></span></> : null}
    </>
  )

  return (
    <Dialog open={mounted && open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-5xl max-h-[92dvh] p-0 overflow-hidden bg-(--color-background) flex flex-col"
      >
        <DialogTitle className="sr-only">{name}</DialogTitle>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">

          {/* Main section: header + 2-col layout */}
          <div className="p-6 md:p-8 md:pb-4">
            {/* Close button */}
            <div className="flex justify-between items-start mb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-blue)">
                {categoryLabel}
              </div>
              <button
                onClick={handleClose}
                className="text-(--shop-ink-soft) hover:text-(--shop-ink) transition-colors -mt-0.5 -mr-1 p-1 rounded"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <h2 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(22px, 4vw, 38px)" }}>
              {name}
            </h2>

            <div className="flex gap-4 text-sm text-(--shop-ink-soft) mt-2.5 flex-wrap">
              {specsRow}
            </div>

            {blurb ? (
              <p className="mt-3 text-base text-(--shop-ink-soft) leading-relaxed max-w-2xl">{blurb}</p>
            ) : null}

            {/* 2-col: image | booking panel */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-6 md:gap-10 items-start">
              {/* Image */}
              <div className="aspect-4/3 relative bg-white border border-(--shop-line) rounded-xl overflow-hidden">
                {imgSrc ? (
                  <Image
                    src={imgSrc}
                    alt={name}
                    fill
                    sizes="(max-width: 768px) 100vw, 55vw"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-sm">
                    {name}
                  </div>
                )}
              </div>

              {/* Booking panel */}
              {isItem ? (
                <ShopItemModalItemBooking item={props.item} avail={props.avail} hasRange={hasRange} />
              ) : (
                <ShopItemModalTentConfigBooking config={props.config} avail={props.avail} hasRange={hasRange} />
              )}
            </div>
          </div>

          {/* 35-day strip — items only, full width */}
          {isItem && props.strip.length > 0 ? (
            <div className="border-t border-(--shop-line) mt-6 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-1.5">Next 35 days</p>
              <h3 className="serif font-medium mb-5" style={{ fontSize: 22 }}>
                Availability at a glance
              </h3>
              <ThirtyDayStrip days={props.strip} />
            </div>
          ) : null}

        </div>
      </DialogContent>
    </Dialog>
  )
}
