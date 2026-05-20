import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import AvailabilityBadge from "@/components/shared/AvailabilityBadge"
import type { TentConfigurationSummary, ConfigAvailabilityResult } from "@/models/inventory"

type Props = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
  hasRange: boolean
}

export default function TentConfigCard({ config, avail, hasRange }: Props) {
  return (
    <Link
      href={`/shop/${config.slug}`}
      className="block bg-white border border-(--shop-line) rounded-xl overflow-hidden hover:-translate-y-1 transition-transform duration-150"
    >
      <div className="aspect-[4/3] bg-(--shop-paper) flex items-center justify-center text-(--shop-ink-soft) text-sm">
        {config.name}
      </div>
      <div className="p-5">
        <div className="flex justify-between items-baseline gap-2 mb-1">
          <h3 className="serif text-2xl font-medium text-(--shop-ink)">{config.name}</h3>
          <span className="mono text-sm">
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
        <div className="flex gap-3 text-xs text-(--shop-ink-soft) mb-3">
          {config.widthFt ? <span>{config.widthFt}×{config.lengthFt} ft</span> : null}
          {config.capacity ? (
            <>
              <span>·</span>
              <span>Up to {config.capacity}</span>
            </>
          ) : null}
        </div>
        {config.blurb ? (
          <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-4">{config.blurb}</p>
        ) : null}
        <div className="flex items-center justify-between">
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
