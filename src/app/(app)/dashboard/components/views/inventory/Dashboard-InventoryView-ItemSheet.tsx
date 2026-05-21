"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { AdminItemSummary } from "@/models/inventory"

type Props = {
  item: AdminItemSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminItemSummary) => void
}

export default function DashboardInventoryViewItemSheet({ item, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState("")
  const [isPending, startTransition] = useTransition()

  // Sync fields when item changes
  useEffect(() => {
    if (item) {
      setQty(item.qty !== null ? String(item.qty) : "")
      setIsActive(item.isActive)
      setImageUrl(item.primaryImageUrl ?? "")
    }
  }, [item])

  function handleSave() {
    if (!item) return
    const parsed = parseInt(qty, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: parsed, isActive, primaryImageUrl: imageUrl || null }),
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
            <div className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-3">
              <Label htmlFor="inv-item-active" className="text-sm text-(--color-foreground) cursor-pointer">Active</Label>
              <Switch
                id="inv-item-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-image" className="text-xs uppercase tracking-wide text-(--color-muted)">Primary Image URL</Label>
              <Input
                id="inv-item-image"
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="text-base"
              />
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !item} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
