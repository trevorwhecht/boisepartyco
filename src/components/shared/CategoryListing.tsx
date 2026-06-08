"use client"
import { useState } from "react"
import { Grid, List } from "lucide-react"
import ItemCardGrid from "@/components/shared/ItemCard-Grid"
import ItemCardList from "@/components/shared/ItemCard-List"
import { useCart } from "@/contexts/CartContext"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
import type { ItemSummary, AvailabilityResult } from "@/models/inventory"

export type ItemWithAvail = {
  item: ItemSummary
  avail: AvailabilityResult
}

type Props = {
  items: ItemWithAvail[]
  hasRange: boolean
  dateLabel?: string
}

export default function CategoryListing({ items, hasRange, dateLabel }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const { lines, addToCart, updateLine } = useCart()
  const mode = useInventoryMode()

  const visible = hideUnavailable && hasRange
    ? items.filter(x => x.avail.available > 0)
    : items

  // Group by subcategory preserving first-appearance order
  const groups: { name: string; items: ItemWithAvail[] }[] = []
  const seen = new Map<string, number>()
  visible.forEach(x => {
    const key = x.item.subcategory ?? "Other"
    if (!seen.has(key)) { seen.set(key, groups.length); groups.push({ name: key, items: [] }) }
    groups[seen.get(key)!].items.push(x)
  })

  return (
    <>
      {/* Filter strip */}
      <div className="bg-white border-b border-(--shop-line) py-4 sticky top-32 md:top-25.75 z-30">
        <div className="max-w-330 mx-auto px-4 md:px-8 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <span className="text-sm text-(--shop-ink-soft)">
              <strong className="text-(--shop-ink)">{visible.length}</strong> items
              {dateLabel ? <> · for {dateLabel}</> : null}
            </span>
            {hasRange && mode !== "off" ? (
              <label className="inline-flex gap-2 items-center text-sm text-(--shop-ink-soft) cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideUnavailable}
                  onChange={e => setHideUnavailable(e.target.checked)}
                />
                Hide fully-booked
              </label>
            ) : null}
          </div>
          <div className="flex gap-1.5 p-0.5 bg-(--shop-paper) rounded-lg">
            {(["grid", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex gap-1.5 items-center transition-colors ${
                  view === v ? "bg-white text-(--shop-ink) shadow-sm" : "text-(--shop-ink-soft)"
                }`}>
                {v === "grid" ? <Grid size={13} /> : <List size={13} />}
                {v === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="max-w-330 mx-auto px-4 md:px-8 py-10 pb-20">
        {groups.map((g, gi) => (
          <div key={g.name} className={gi < groups.length - 1 ? "mb-14" : ""}>
            {groups.length > 1 ? (
              <div className="flex justify-between items-baseline mb-6 pb-3 border-b border-(--shop-line)">
                <h2 className="serif text-3xl font-medium">{g.name}</h2>
                <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">
                  {g.items.length} {g.items.length === 1 ? "item" : "items"}
                </span>
              </div>
            ) : null}
            {view === "grid" ? (
              <div className="grid gap-4 md:gap-7 grid-cols-2 md:grid-cols-3">
                {g.items.map(({ item, avail }) => (
                  <ItemCardGrid
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice, imageUrl) => addToCart(refId, "item", qty, name, unitPrice, imageUrl)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {g.items.map(({ item, avail }) => (
                  <ItemCardList
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice, imageUrl) => addToCart(refId, "item", qty, name, unitPrice, imageUrl)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="text-center py-20 text-(--shop-ink-soft)">
            No items available for these dates. Try different dates or{" "}
            <button onClick={() => setHideUnavailable(false)} className="text-(--shop-blue) underline">
              show all items
            </button>.
          </div>
        ) : null}
      </div>
    </>
  )
}
