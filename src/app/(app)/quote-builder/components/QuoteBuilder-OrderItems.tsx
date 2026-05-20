"use client"

import { useEffect, useState } from "react"
import { Trash2, ChevronDown, Loader2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { newLocalId } from "../quoteBuilderUtils"
import SectionShell from "@/components/shared/layout/SectionShell"
import type { DraftLineItem } from "../QuoteBuilder"
import type { QuoteBuilderPermissions } from "../quoteBuilderPermissions"

type InventoryItem = { id: number; name: string; flatPrice: number }

type Props = {
  items: DraftLineItem[]
  onChange: (items: DraftLineItem[]) => void
  permissions: QuoteBuilderPermissions
}

export default function QuoteBuilderOrderItems({ items, onChange, permissions }: Props) {
  const [showInventoryDialog, setShowInventoryDialog] = useState(false)
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [customDraft, setCustomDraft] = useState({ description: "", qty: 1, unitPrice: 0, unitCost: 0 })

  // Inventory search state
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [inventorySearch, setInventorySearch] = useState("")
  const [inventorySelected, setInventorySelected] = useState<InventoryItem | null>(null)
  const [inventoryQty, setInventoryQty] = useState(1)

  useEffect(() => {
    if (!showInventoryDialog) return
    setInventoryLoading(true)
    fetch("/api/inventory/items")
      .then((r) => r.json())
      .then(({ data }) => { if (data) setAllInventoryItems(data) })
      .finally(() => setInventoryLoading(false))
  }, [showInventoryDialog])

  function resetInventoryDialog() {
    setInventorySearch("")
    setInventorySelected(null)
    setInventoryQty(1)
  }

  function handleInventoryOpenChange(v: boolean) {
    if (!v) resetInventoryDialog()
    setShowInventoryDialog(v)
  }

  function addFromInventory() {
    if (!inventorySelected) return
    onChange([...items, {
      localId: newLocalId(),
      description: inventorySelected.name,
      qty: inventoryQty,
      unitPrice: Number(inventorySelected.flatPrice),
      unitCost: 0,
    }])
    resetInventoryDialog()
    setShowInventoryDialog(false)
  }

  const filteredInventory = inventorySearch.trim()
    ? allInventoryItems.filter((i) => i.name.toLowerCase().includes(inventorySearch.toLowerCase()))
    : allInventoryItems

  function updateItem(localId: string, field: keyof DraftLineItem, value: string | number) {
    onChange(items.map((item) => item.localId === localId ? { ...item, [field]: value } : item))
  }

  function removeItem(localId: string) {
    onChange(items.filter((item) => item.localId !== localId))
  }

  function addCustomItem() {
    onChange([...items, { localId: newLocalId(), ...customDraft }])
    setCustomDraft({ description: "", qty: 1, unitPrice: 0, unitCost: 0 })
    setShowCustomDialog(false)
  }

  const isAdmin = permissions.canEditLineItemPrices
  const canEdit = permissions.canEditLineItemQty

  const totalQty = items.reduce((s, li) => s + li.qty, 0)
  const totalAmount = items.reduce((s, li) => s + li.qty * li.unitPrice, 0)
  const totalCost = items.reduce((s, li) => s + li.qty * li.unitCost, 0)
  const totalProfit = totalAmount - totalCost

  return (
    <SectionShell
      title="Order Items"
      action={permissions.canAddRemoveLineItems ? (
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" }) + " gap-1"}>
            Add Line Item <ChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-(--color-background)">
            <DropdownMenuItem onClick={() => setShowInventoryDialog(true)}>
              Add from Inventory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCustomDialog(true)}>
              + Add Custom Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    >
      <div className="w-full overflow-x-auto border border-(--color-border) rounded-lg">
        <table className={`w-full text-sm ${isAdmin ? "min-w-180" : "min-w-120"}`}>
          <thead>
            <tr className="border-b border-(--color-border) bg-(--color-surface)">
              <th className="text-left px-3 py-2.5 font-medium text-(--color-muted)">Description</th>
              <th className="text-right px-3 py-2.5 font-medium text-(--color-muted) w-16">Qty</th>
              <th className="text-right px-3 py-2.5 font-medium text-(--color-muted) w-24">Rate</th>
              {isAdmin ? <th className="text-right px-3 py-2.5 font-medium text-(--color-muted) w-24">Cost</th> : null}
              <th className="text-right px-3 py-2.5 font-medium text-(--color-muted) w-24">Amount</th>
              {isAdmin ? <th className="text-right px-3 py-2.5 font-medium text-(--color-success) w-24">Profit</th> : null}
              {permissions.canAddRemoveLineItems ? <th className="w-8" /> : null}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.localId} className="border-b border-(--color-border) last:border-0">
                <td className="px-3 py-2">
                  {canEdit ? (
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.localId, "description", e.target.value)}
                      className="text-base h-8"
                      placeholder="Description"
                    />
                  ) : (
                    <span className="text-(--color-foreground)">{item.description}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {canEdit ? (
                    <Input
                      type="number" inputMode="numeric" min={1}
                      value={item.qty}
                      onChange={(e) => updateItem(item.localId, "qty", Math.max(1, Number(e.target.value)))}
                      className="text-base h-8 w-16 text-right"
                    />
                  ) : (
                    <span>{item.qty}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isAdmin ? (
                    <Input
                      type="number" inputMode="decimal" step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.localId, "unitPrice", Number(e.target.value))}
                      className="text-base h-8 w-24 text-right"
                    />
                  ) : (
                    <span className="text-(--color-muted)">${item.unitPrice.toFixed(2)}</span>
                  )}
                </td>
                {isAdmin ? (
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number" inputMode="decimal" step="0.01"
                      value={item.unitCost}
                      onChange={(e) => updateItem(item.localId, "unitCost", Number(e.target.value))}
                      className="text-base h-8 w-24 text-right"
                    />
                  </td>
                ) : null}
                <td className="px-3 py-2 text-right font-medium text-(--color-foreground)">
                  ${(item.qty * item.unitPrice).toFixed(2)}
                </td>
                {isAdmin ? (
                  <td className="px-3 py-2 text-right text-(--color-success)">
                    ${((item.qty * item.unitPrice) - (item.qty * item.unitCost)).toFixed(2)}
                  </td>
                ) : null}
                {permissions.canAddRemoveLineItems ? (
                  <td className="px-3 py-2">
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 w-8 p-0 text-(--color-danger)"
                      onClick={() => removeItem(item.localId)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
            <tr className="border-t-2 border-(--color-border) bg-(--color-surface) font-semibold">
              <td className="px-3 py-2 text-(--color-muted) text-xs uppercase">Totals</td>
              <td className="px-3 py-2 text-right">{totalQty}</td>
              <td />
              {isAdmin ? <td className="px-3 py-2 text-right text-xs text-(--color-muted)">${totalCost.toFixed(2)}</td> : null}
              <td className="px-3 py-2 text-right">${totalAmount.toFixed(2)}</td>
              {isAdmin ? <td className="px-3 py-2 text-right text-(--color-success)">${totalProfit.toFixed(2)}</td> : null}
              {permissions.canAddRemoveLineItems ? <td /> : null}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Inventory search dialog */}
      <Dialog open={showInventoryDialog} onOpenChange={handleInventoryOpenChange}>
        <DialogContent className="bg-(--color-background)">
          <DialogHeader>
            <DialogTitle>Add from Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Search items</Label>
              <Input
                value={inventorySearch}
                onChange={(e) => { setInventorySearch(e.target.value); setInventorySelected(null) }}
                placeholder="Type to filter items…"
                className="text-base"
                autoFocus
              />
            </div>
            {inventoryLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-(--color-muted)" /></div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-(--color-border) rounded-md divide-y divide-(--color-border)">
                {filteredInventory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setInventorySelected(item)}
                    className={`w-full text-left px-3 py-2.5 text-sm flex justify-between items-center gap-3 hover:bg-(--color-surface) transition-colors ${inventorySelected?.id === item.id ? "bg-(--color-surface) font-medium" : ""}`}
                  >
                    <span>{item.name}</span>
                    <span className="text-(--color-muted) shrink-0">${Number(item.flatPrice).toFixed(0)}/day</span>
                  </button>
                ))}
                {filteredInventory.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-(--color-muted)">No items match "{inventorySearch}"</div>
                ) : null}
              </div>
            )}
            {inventorySelected ? (
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input type="number" inputMode="numeric" min={1} value={inventoryQty}
                  onChange={(e) => setInventoryQty(Math.max(1, Number(e.target.value)))} className="text-base" />
              </div>
            ) : null}
          </div>
          <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" onClick={() => handleInventoryOpenChange(false)}>Cancel</Button>
            <Button autoFocus onClick={addFromInventory} disabled={!inventorySelected}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom item dialog */}
      <Dialog open={showCustomDialog} onOpenChange={(v) => { if (!v) setCustomDraft({ description: "", qty: 1, unitPrice: 0, unitCost: 0 }); setShowCustomDialog(v) }}>
        <DialogContent className="bg-(--color-background)">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={customDraft.description}
                onChange={(e) => setCustomDraft((d) => ({ ...d, description: e.target.value }))}
                className="text-base"
                placeholder="Item description"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input type="number" inputMode="numeric" min={1} value={customDraft.qty}
                  onChange={(e) => setCustomDraft((d) => ({ ...d, qty: Math.max(1, Number(e.target.value)) }))}
                  className="text-base" />
              </div>
              {isAdmin ? (
                <>
                  <div className="space-y-1.5">
                    <Label>Price</Label>
                    <Input type="number" inputMode="decimal" step="0.01" value={customDraft.unitPrice}
                      onChange={(e) => setCustomDraft((d) => ({ ...d, unitPrice: Number(e.target.value) }))}
                      className="text-base" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cost</Label>
                    <Input type="number" inputMode="decimal" step="0.01" value={customDraft.unitCost}
                      onChange={(e) => setCustomDraft((d) => ({ ...d, unitCost: Number(e.target.value) }))}
                      className="text-base" />
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
            <Button autoFocus onClick={addCustomItem} disabled={!customDraft.description}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  )
}
