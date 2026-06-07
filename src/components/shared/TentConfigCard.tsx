"use client"
import Image from "next/image"
import { AlertTriangle, Info, Pencil, Plus } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import AvailabilityCalendarPopover from "@/components/shared/AvailabilityCalendarPopover"
import QtyStepper from "@/components/shared/QtyStepper"
import { TENT_IMAGES } from "@/lib/tent-images"
import { useCart } from "@/contexts/CartContext"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
import { useAdminQuickEdit } from "@/contexts/AdminQuickEditContext"
import { useSession } from "next-auth/react"
import type { TentConfigurationSummary, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

export default function TentConfigCard({ config, avail, hasRange }: Props) {
  const mode = useInventoryMode()
  const quickEdit = useAdminQuickEdit()
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === "admin"
  const isEmployee = role === "employee"
  const { lines, addToCart, updateLine } = useCart()
  const imgSrc = config.primaryImageUrl ?? TENT_IMAGES[config.slug] ?? null
  const cartLine = lines.find((l) => l.refId === config.id && l.kind === "tentConfig") ?? null
  const disabled = hasRange && avail.available <= 0
  const maxQty = hasRange ? Math.max(1, avail.available + (cartLine?.qty ?? 0)) : 99

  return (
    <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden flex flex-col">
      {/* Image */}
      <div className="aspect-4/3 relative bg-(--shop-paper) group">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={config.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-(--shop-ink-soft) text-sm">
            {config.name}
          </div>
        )}
        {isAdmin ? (
          <button
            type="button"
            onClick={() => quickEdit?.openTentEdit(config.id)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-(--color-border) p-1.5 text-(--color-muted) hover:text-(--color-foreground) transition-colors"
            aria-label="Edit tent"
          >
            <Pencil size={12} />
          </button>
        ) : isEmployee ? (
          <button
            type="button"
            onClick={() => quickEdit?.openTentView(config.id)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-(--color-border) p-1.5 text-(--color-muted) hover:text-(--color-foreground) transition-colors"
            aria-label="View packing list"
          >
            <Info size={12} />
          </button>
        ) : null}
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <h3 className="serif text-xl md:text-2xl font-medium text-(--shop-ink) leading-tight">
            {config.name}
          </h3>
          <span className="mono text-sm whitespace-nowrap">
            {Number(config.flatPrice) > 0 ? (
              <>
                <strong>${Number(config.flatPrice).toFixed(0)}</strong>
                <span className="text-(--shop-ink-soft)">/day</span>
              </>
            ) : (
              <strong className="text-(--shop-blue)">Call</strong>
            )}
          </span>
        </div>

        <div className="flex gap-2 text-xs text-(--shop-ink-soft) mb-3 flex-wrap">
          {config.widthFt ? <span>{config.widthFt}×{config.lengthFt} ft</span> : null}
          {config.capacity ? (
            <>
              <span>·</span>
              <span>Up to {config.capacity}</span>
            </>
          ) : null}
        </div>

        {config.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4 hidden sm:block flex-1">{config.blurb}</p>
        ) : <div className="flex-1" />}

        {!avail.bomComplete ? (
          <div className="mb-3 inline-flex items-center gap-1 text-xs text-(--shop-warn)">
            <AlertTriangle size={12} /> Contact for exact pricing
          </div>
        ) : null}

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
              <AvailabilityBadge stock={avail.stock} available={avail.available} hasRange={hasRange} />
              <AvailabilityCalendarPopover configId={config.id} name={config.name} />
            </div>
            {/* Add / stepper row */}
            <div className="flex justify-end">
              {cartLine ? (
                <QtyStepper
                  compact
                  value={cartLine.qty}
                  min={1}
                  max={maxQty}
                  onChange={(q) => updateLine(config.id, "tentConfig", q)}
                />
              ) : (
                <button
                  disabled={disabled}
                  onClick={() => addToCart(config.id, "tentConfig", 1, config.name, Number(config.flatPrice))}
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
