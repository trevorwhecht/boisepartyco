"use client"
import TentConfigCard from "@/components/shared/TentConfigCard"
import CategoryListing from "@/components/shared/CategoryListing"
import type { TentConfigurationSummary, ConfigAvailabilityResult, ItemSummary, AvailabilityResult } from "@/models/inventory"

type ConfigWithAvail = {
  config: TentConfigurationSummary
  avail: ConfigAvailabilityResult
}

type Props = {
  configs: ConfigWithAvail[]
  items: { item: ItemSummary; avail: AvailabilityResult }[]
  hasRange: boolean
  dateLabel?: string
}

export default function TentsListing({ configs, items, hasRange, dateLabel }: Props) {
  return (
    <>
      {/* Tent configurations */}
      {configs.length > 0 ? (
        <section className="max-w-[1320px] mx-auto px-8 pt-12 pb-6">
          <div className="flex justify-between items-baseline mb-6 pb-3 border-b border-(--shop-line)">
            <h2 className="serif text-3xl font-medium">Tent Packages</h2>
            <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">{configs.length} configs</span>
          </div>
          <div className="grid gap-7" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {configs.map(({ config, avail }) => (
              <TentConfigCard key={config.id} config={config} avail={avail} hasRange={hasRange} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Individual tent items (accessories etc.) */}
      {items.length > 0 ? (
        <section className="mt-8">
          {configs.length > 0 ? (
            <div className="max-w-[1320px] mx-auto px-8 mb-2">
              <div className="flex justify-between items-baseline pb-3 border-b border-(--shop-line)">
                <h2 className="serif text-3xl font-medium">Tent Accessories</h2>
              </div>
            </div>
          ) : null}
          <CategoryListing items={items} hasRange={hasRange} dateLabel={dateLabel} />
        </section>
      ) : null}

      {configs.length === 0 && items.length === 0 ? (
        <div className="max-w-[1320px] mx-auto px-8 py-24 text-center text-(--shop-ink-soft)">
          No tent inventory found. Check back soon.
        </div>
      ) : null}
    </>
  )
}
