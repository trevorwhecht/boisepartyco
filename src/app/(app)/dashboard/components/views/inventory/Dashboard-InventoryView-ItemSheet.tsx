"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { AdminItemSummary, PricingMode } from "@/models/inventory"
import { ITEM_IMAGES } from "@/lib/item-images"
import DashboardInventoryViewImageUpload from "./Dashboard-InventoryView-ImageUpload"

type Props = {
  item: AdminItemSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminItemSummary) => void
}

export default function DashboardInventoryViewItemSheet({ item, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [flatPrice, setFlatPrice] = useState("")
  const [pricingMode, setPricingMode] = useState<PricingMode>("per_day")
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (item) {
      setQty(item.qty !== null ? String(item.qty) : "")
      setIsActive(item.isActive)
      setImageUrl(item.primaryImageUrl ?? null)
      setFlatPrice(String(item.flatPrice))
      setPricingMode(item.pricingMode)
    }
  }, [item])

  function handleSave() {
    if (!item) return

    // qty is optional — items with no tracked quantity leave this field blank
    const qtyStr = qty.trim()
    let parsedQty: number | undefined
    if (qtyStr !== "") {
      parsedQty = parseInt(qtyStr, 10)
      if (isNaN(parsedQty) || parsedQty < 0) {
        toast.error("Qty must be a non-negative whole number.")
        return
      }
    }

    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (use 0 for 'call for pricing').")
      return
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(parsedQty !== undefined ? { qty: parsedQty } : {}),
          isActive,
          primaryImageUrl: imageUrl || null,
          flatPrice: parsedPrice,
          pricingMode,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        return
      }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Edit Item</SheetTitle>
        </SheetHeader>

        {item ? (
          <div className="flex-1 space-y-4 mt-4 px-1 overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Name</Label>
              <p className="text-sm text-(--color-foreground) rounded-md bg-(--color-surface) px-3 py-2">{item.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">SKU</Label>
              <p className="text-sm font-mono text-(--color-muted) rounded-md bg-(--color-surface) px-3 py-2">{item.sku}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-qty" className="text-xs uppercase tracking-wide text-(--color-muted)">Qty Owned</Label>
              <Input
                id="inv-item-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Physical units in your possession</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-price" className="text-xs uppercase tracking-wide text-(--color-muted)">Rental Price ($)</Label>
              <Input
                id="inv-item-price"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={flatPrice}
                onChange={e => setFlatPrice(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Set to 0 for "call for pricing"</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-pricing-mode" className="text-xs uppercase tracking-wide text-(--color-muted)">Pricing Mode</Label>
              <select
                id="inv-item-pricing-mode"
                value={pricingMode}
                onChange={e => setPricingMode(e.target.value as PricingMode)}
                className="w-full h-10 rounded-md border border-(--color-border) bg-(--color-background) px-3 text-base text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              >
                <option value="per_day">Per Day</option>
                <option value="per_foot">Per Foot</option>
                <option value="per_event">Per Event</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-3">
              <Label htmlFor="inv-item-active" className="text-sm text-(--color-foreground) cursor-pointer">Active</Label>
              <Switch
                id="inv-item-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Product Image</Label>
              <DashboardInventoryViewImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                disabled={isPending}
                onUploadingChange={setIsUploading}
                itemId={item.id}
                fallbackImageUrl={ITEM_IMAGES[item.slug]}
              />
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || isUploading || !item} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Saving…" : isUploading ? "Uploading…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
