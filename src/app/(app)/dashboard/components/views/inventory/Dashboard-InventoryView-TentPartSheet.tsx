"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { AdminTentPartSummary } from "@/models/inventory"

type Props = {
  part: AdminTentPartSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentPartSummary) => void
}

export default function DashboardInventoryViewTentPartSheet({ part, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (part) setQty(part.qty !== null ? String(part.qty) : "")
  }, [part])

  function handleSave() {
    if (!part) return
    const parsed = parseInt(qty, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: parsed }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Edit Tent Part</SheetTitle>
        </SheetHeader>

        {part ? (
          <div className="flex-1 space-y-4 mt-4 px-1">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Part Name</Label>
              <p className="text-sm text-(--color-foreground) rounded-md bg-(--color-surface) px-3 py-2">{part.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Type</Label>
              <p className="text-sm capitalize text-(--color-muted) rounded-md bg-(--color-surface) px-3 py-2">{part.partType}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-part-qty" className="text-xs uppercase tracking-wide text-(--color-muted)">Qty Owned</Label>
              <Input
                id="inv-part-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Physical units in your possession</p>
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !part} className="w-full gap-2">
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
