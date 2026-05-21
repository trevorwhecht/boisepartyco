"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import DashboardInventoryViewItemSheet from "./Dashboard-InventoryView-ItemSheet"
import type { AdminItemSummary } from "@/models/inventory"

type Props = { categoryId: number; role: string }

export default function DashboardInventoryViewCategoryTab({ categoryId, role }: Props) {
  const [items, setItems] = useState<AdminItemSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<AdminItemSummary | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const isAdmin = role === "admin"

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/inventory/items?categoryId=${categoryId}`)
      .then(r => r.json())
      .then(({ data }) => { if (data) setItems(data) })
      .finally(() => setLoading(false))
  }, [categoryId])

  function handleRowClick(item: AdminItemSummary) {
    if (!isAdmin) return
    setSelectedItem(item)
    setSheetOpen(true)
  }

  function handleSaved(updated: AdminItemSummary) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
  }

  if (loading) {
    return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>
  }

  if (items.length === 0) {
    return <div className="p-6 text-sm text-(--color-muted)">No items in this category.</div>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="rounded-lg border border-(--color-border) overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-(--color-surface) border-b border-(--color-border)">
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">SKU</th>
                <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Qty Owned</th>
                <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Active</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  className={[
                    "border-b border-(--color-border) last:border-0 transition-colors",
                    isAdmin ? "cursor-pointer hover:bg-(--color-surface)" : "",
                    selectedItem?.id === item.id && sheetOpen ? "bg-(--color-surface)" : "",
                  ].join(" ")}
                  onClick={() => handleRowClick(item)}
                >
                  <td className="px-4 py-3 font-medium text-(--color-foreground)">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-(--color-muted)">{item.sku}</td>
                  <td className="px-4 py-3 text-center font-semibold text-(--color-foreground)">
                    {item.qty !== null ? item.qty : <span className="text-(--color-muted)">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.isActive ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-(--color-muted) text-xs">Off</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin ? (
        <DashboardInventoryViewItemSheet
          item={selectedItem}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}
