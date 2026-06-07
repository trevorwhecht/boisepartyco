"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentConfigSummary) => void
  role: string
}

export default function DashboardInventoryViewTentConfigSheet({ config, open, onOpenChange, onSaved, role }: Props) {
  const isAdmin = role === "admin"
  const [flatPrice, setFlatPrice] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (config) setFlatPrice(String(config.flatPrice))
  }, [config])

  function handleSave() {
    if (!config) return
    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (use 0 for 'call for pricing').")
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatPrice: parsedPrice }),
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
          <SheetTitle className="text-(--color-foreground)">
            {isAdmin ? "Edit Configuration" : "Packing List"}
          </SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="flex-1 space-y-5 mt-4 px-1 overflow-y-auto">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">{config.widthFt}×{config.lengthFt} ft</p>
            </div>

            {isAdmin ? (
              <div className="space-y-1">
                <Label htmlFor="tent-config-price" className="text-xs uppercase tracking-wide text-(--color-muted)">Rental Price ($)</Label>
                <Input
                  id="tent-config-price"
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
            ) : null}

            <div>
              <p className="text-xs uppercase tracking-wide text-(--color-muted) mb-2">Parts required × 1 tent</p>
              {config.bomParts.length === 0 ? (
                <p className="text-sm text-(--color-muted)">No parts defined yet.</p>
              ) : (
                <ul className="space-y-2">
                  {config.bomParts.map(part => (
                    <li
                      key={part.tentPartId}
                      className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-2 text-sm"
                    >
                      <span className="text-(--color-foreground)">{part.name}</span>
                      <span className="font-bold text-(--color-foreground)">× {part.qtyRequired}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isAdmin && config.bottleneck ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <span className="font-semibold">Bottleneck:</span> {config.bottleneck.name} — need {config.bottleneck.qtyRequired} per tent,
                have {config.bottleneck.stock} → max {config.bottleneck.maxFromThisPart} tents
              </div>
            ) : null}

            {!isAdmin && (
              <p className="text-xs text-(--color-muted)">
                Contact an admin to update tent part quantities.
              </p>
            )}

            {!config.bomComplete && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ BOM incomplete
              </Badge>
            )}
          </div>
        ) : null}

        {isAdmin ? (
          <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button onClick={handleSave} disabled={isPending || !config} className="w-full gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
              Cancel
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
