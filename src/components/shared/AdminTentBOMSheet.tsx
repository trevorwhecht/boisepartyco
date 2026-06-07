"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentConfigSummary) => void
}

type BomQtys = Record<number, string>

export default function AdminTentBOMSheet({ config, open, onOpenChange, onSaved }: Props) {
  const [bomQtys, setBomQtys] = useState<BomQtys>({})
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (config) {
      const qtys: BomQtys = {}
      config.bomParts.forEach(p => { qtys[p.tentPartId] = String(p.qtyRequired) })
      setBomQtys(qtys)
    }
  }, [config])

  function handleSave() {
    if (!config) return

    let valid = true
    const bomParts = config.bomParts.map(p => {
      const qty = parseInt(bomQtys[p.tentPartId] ?? String(p.qtyRequired), 10)
      if (isNaN(qty) || qty < 0) {
        toast.error(`Invalid quantity for ${p.name}`)
        valid = false
        return { tentPartId: p.tentPartId, qtyRequired: 0 }
      }
      return { tentPartId: p.tentPartId, qtyRequired: qty }
    })
    if (!valid) return

    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomParts }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      onSaved(json.data)
      toast.success("BOM updated")
      onOpenChange(false)
    })
  }

  const priceDisplay = config
    ? config.flatPrice === 0 ? "Call for pricing" : `$${config.flatPrice}/day`
    : ""

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Edit BOM</SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="flex-1 space-y-5 mt-4 px-1 overflow-y-auto">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">
                {config.widthFt}×{config.lengthFt} ft · {priceDisplay}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">
                Parts Required × 1 Tent
              </Label>
              {config.bomParts.length === 0 ? (
                <p className="text-sm text-(--color-muted)">No parts defined yet.</p>
              ) : (
                <ul className="space-y-2">
                  {config.bomParts.map(part => (
                    <li
                      key={part.tentPartId}
                      className="flex items-center gap-3 rounded-md bg-(--color-surface) px-3 py-2"
                    >
                      <span className="text-sm text-(--color-foreground) flex-1 min-w-0 truncate">
                        {part.name}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-(--color-muted)">×</span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={bomQtys[part.tentPartId] ?? ""}
                          onChange={e => setBomQtys(prev => ({ ...prev, [part.tentPartId]: e.target.value }))}
                          className="w-16 text-base text-center font-semibold"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-(--color-muted)" />
          </div>
        )}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !config} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Save BOM"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
