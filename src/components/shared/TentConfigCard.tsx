import Image from "next/image"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import { TENT_IMAGES } from "@/lib/tent-images"
import type { TentConfigurationSummary, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

export default function TentConfigCard({ config, avail, hasRange }: Props) {
  const imgSrc = TENT_IMAGES[config.slug] ?? null

  return (
    <Link
      href={`/tents/${config.slug}`}
      className="block bg-white border border-(--shop-line) rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-150"
    >
      <div className="aspect-4/3 relative bg-(--shop-paper)">
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
      </div>
      <div className="p-4 md:p-5">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <h3 className="serif text-xl md:text-2xl font-medium text-(--shop-ink) leading-tight">{config.name}</h3>
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
          <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4 hidden sm:block">{config.blurb}</p>
        ) : null}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <AvailabilityBadge stock={avail.stock} available={avail.available} hasRange={hasRange} />
          {!avail.bomComplete ? (
            <span className="inline-flex items-center gap-1 text-xs text-(--shop-warn)">
              <AlertTriangle size={12} /> Contact for pricing
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
