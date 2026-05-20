"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

export type AddItemResult = {
  itemId: number | null
  description: string
  qty: number
  unitPrice: number
  unitCost: number
  isCustom: boolean
}

type InventoryItem = { id: number; name: string; flatPrice: number }

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  isAdmin: boolean
  onAdd: (item: AddItemResult) => void
}

export default function GetQuoteAddItemDialog({ open, onOpenChange, isAdmin, onAdd }: Props) {
  const [allItems, setAllItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [qty, setQty] = useState(1)
  const [customDescription, setCustomDescription] = useState("")
  const [customPrice, setCustomPrice] = useState(0)
  const [customCost, setCustomCost] = useState(0)
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then(({ data }) => { if (data) setAllItems(data) })
      .finally(() => setLoading(false))
  }, [open])

  const filtered = search.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : allItems

  function reset() {
    setSearch("")
    setSelected(null)
    setQty(1)
    setCustomDescription("")
    setCustomPrice(0)
    setCustomCost(0)
    setIsCustom(false)
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function handleAdd() {
    if (isCustom) {
      if (!customDescription.trim()) return
      onAdd({ itemId: null, description: customDescription, qty, unitPrice: customPrice, unitCost: customCost, isCustom: true })
    } else {
      if (!selected) return
      onAdd({ itemId: selected.id, description: selected.name, qty, unitPrice: Number(selected.flatPrice), unitCost: 0, isCustom: false })
    }
    reset()
    onOpenChange(false)
  }

  const canAdd = isCustom ? !!customDescription.trim() : !!selected

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-(--color-background)">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Search inventory</Label>
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIsCustom(false); setSelected(null) }}
              placeholder="Type to filter items…"
              className="text-base"
              autoFocus
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-(--color-muted)" /></div>
          ) : (
            <div className="max-h-48 overflow-y-auto border border-(--color-border) rounded-md divide-y divide-(--color-border)">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSelected(item); setIsCustom(false) }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center gap-3 hover:bg-(--color-surface) transition-colors ${selected?.id === item.id ? "bg-(--color-surface) font-medium" : ""}`}
                >
                  <span>{item.name}</span>
                  <span className="text-(--color-muted) shrink-0">${Number(item.flatPrice).toFixed(0)}/day</span>
                </button>
              ))}
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-(--color-muted)">No items match "{search}"</div>
              ) : null}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-item"
              checked={isCustom}
              onChange={(e) => { setIsCustom(e.target.checked); setSelected(null) }}
            />
            <label htmlFor="custom-item" className="text-sm text-(--color-muted) cursor-pointer">Custom item (not in inventory)</label>
          </div>

          {isCustom ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Describe the custom item" className="text-base" />
              </div>
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Price</Label>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))} className="text-base" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost</Label>
                    <Input type="number" inputMode="decimal" step="0.01" min={0} value={customCost}
                      onChange={(e) => setCustomCost(Number(e.target.value))} className="text-base" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {(selected || isCustom) ? (
            <div className="space-y-1.5">
              <Label>Qty</Label>
              <Input type="number" inputMode="numeric" min={1} value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="text-base" />
            </div>
          ) : null}
        </div>
        <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button autoFocus onClick={handleAdd} disabled={!canAdd}>Add Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
