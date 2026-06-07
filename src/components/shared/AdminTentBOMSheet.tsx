"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { AdminTentConfigSummary, AdminTentPartSummary } from "@/models/inventory"
import DashboardInventoryViewImageUpload from "@/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ImageUpload"
import { TENT_IMAGES } from "@/lib/tent-images"

type Props = {
  config: AdminTentConfigSummary | null
  allParts?: AdminTentPartSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminTentConfigSummary) => void
}

type PartQtys = Record<number, string>

export default function AdminTentBOMSheet({ config, allParts, open, onOpenChange, onSaved }: Props) {
  const [partQtys, setPartQtys] = useState<PartQtys>({})
  const [bomQtyRequired, setBomQtyRequired] = useState<PartQtys>({})
  const [flatPrice, setFlatPrice] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [bomEditMode, setBomEditMode] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isBOMPending, startBOMTransition] = useTransition()

  useEffect(() => {
    if (config) {
      const qtys: PartQtys = {}
      config.bomParts.forEach(p => {
        qtys[p.tentPartId] = p.qty !== null ? String(p.qty) : ""
      })
      setPartQtys(qtys)
      setFlatPrice(String(config.flatPrice))
      setImageUrl(config.primaryImageUrl ?? null)
      setBomEditMode(false)
    }
  }, [config])

  function enterBOMEditMode() {
    const bom: PartQtys = {}
    // Default all parts to 0, then override with existing BOM values
    allParts?.forEach(p => { bom[p.id] = "0" })
    config?.bomParts.forEach(p => { bom[p.tentPartId] = String(p.qtyRequired) })
    setBomQtyRequired(bom)
    setBomEditMode(true)
  }

  function cancelBOMEdit() {
    setBomEditMode(false)
  }

  function handleSave() {
    if (!config) return

    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (0 = call for pricing).")
      return
    }

    const partUpdates: { tentPartId: number; qty: number }[] = []
    let valid = true
    for (const part of config.bomParts) {
      if (part.qty === null) continue
      const raw = partQtys[part.tentPartId]
      if (raw === "" || raw === undefined) continue
      const qty = parseInt(raw, 10)
      if (isNaN(qty) || qty < 0) {
        toast.error(`Invalid qty for ${part.name}`)
        valid = false
        break
      }
      if (qty !== part.qty) partUpdates.push({ tentPartId: part.tentPartId, qty })
    }
    if (!valid) return

    startTransition(async () => {
      const requests: Promise<Response>[] = []

      const configChanged = parsedPrice !== config.flatPrice || imageUrl !== config.primaryImageUrl
      if (configChanged) {
        requests.push(
          fetch(`/api/admin/inventory/tent-configurations/${config.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(parsedPrice !== config.flatPrice ? { flatPrice: parsedPrice } : {}),
              ...(imageUrl !== config.primaryImageUrl ? { primaryImageUrl: imageUrl } : {}),
            }),
          })
        )
      }

      for (const { tentPartId, qty } of partUpdates) {
        requests.push(
          fetch(`/api/admin/inventory/tent-parts/${tentPartId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qty }),
          })
        )
      }

      if (requests.length > 0) {
        const results = await Promise.all(requests.map(r => r.then(res => res.json())))
        const failed = results.find(r => r.error)
        if (failed) { toast.error(failed.error); return }
      }

      const res = await fetch(`/api/admin/inventory/tent-configurations/${config.id}`)
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  function handleSaveBOM() {
    if (!config) return

    const partsSource = allParts ?? config.bomParts.map(p => ({ id: p.tentPartId, name: p.name }))

    const parts: { tentPartId: number; qtyRequired: number }[] = []
    let valid = true
    for (const part of partsSource) {
      const raw = bomQtyRequired[part.id]
      const qty = parseInt(raw ?? "0", 10)
      if (isNaN(qty) || qty < 0) {
        toast.error(`Invalid quantity for ${part.name}`)
        valid = false
        break
      }
      parts.push({ tentPartId: part.id, qtyRequired: qty })
    }
    if (!valid) return

    startBOMTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bomParts: parts }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      onSaved(json.data)
      toast.success("BOM saved")
      setBomEditMode(false)
      onOpenChange(false)
    })
  }

  // Parts to render in BOM edit mode — all available parts, grouped by type
  const bomEditParts = allParts ?? config?.bomParts.map(p => ({
    id: p.tentPartId,
    name: p.name,
    partType: p.partType as string,
    qty: p.qty,
    isSerialized: false,
    isActive: true,
  })) ?? []

  const partGroups = [
    { label: "Panels", parts: bomEditParts.filter(p => p.partType === "panel") },
    { label: "Poles", parts: bomEditParts.filter(p => p.partType === "pole") },
    { label: "Crowns", parts: bomEditParts.filter(p => p.partType === "crown") },
    { label: "Hardware", parts: bomEditParts.filter(p => p.partType === "hardware") },
  ].filter(g => g.parts.length > 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2 pr-6">
            <SheetTitle className="text-(--color-foreground)">
              {bomEditMode ? `BOM: ${config?.name ?? ""}` : `Edit Tent: ${config?.name ?? ""}`}
            </SheetTitle>
            {config && !bomEditMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={enterBOMEditMode}
                className="text-xs h-7 shrink-0 mt-0.5"
              >
                Edit BOM
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        {config ? (
          <div className="flex-1 mt-4 px-1 overflow-y-auto space-y-6">

            {bomEditMode ? (
              // BOM edit mode: show ALL parts grouped by type
              <div className="space-y-4">
                <p className="text-xs text-(--color-muted)">Set how many of each part this tent configuration requires. Leave at 0 to exclude.</p>
                {partGroups.map(group => (
                  <div key={group.label} className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-(--color-muted)">{group.label}</Label>
                    <ul className="space-y-2">
                      {group.parts.map(part => (
                        <li
                          key={part.id}
                          className="flex items-center gap-3 rounded-md bg-(--color-surface) px-3 py-2"
                        >
                          <p className="flex-1 text-sm font-medium text-(--color-foreground) truncate">{part.name}</p>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={bomQtyRequired[part.id] ?? "0"}
                            onChange={e => setBomQtyRequired(prev => ({ ...prev, [part.id]: e.target.value }))}
                            className="w-20 text-base text-center font-semibold shrink-0"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              // Normal mode: inventory qty editing
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Inventory</Label>
                  {config.bomParts.length === 0 ? (
                    <p className="text-sm text-(--color-muted)">No BOM parts configured.</p>
                  ) : (
                    <ul className="space-y-2">
                      {config.bomParts.map(part => (
                        <li
                          key={part.tentPartId}
                          className="flex items-center gap-3 rounded-md bg-(--color-surface) px-3 py-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-(--color-foreground) truncate">{part.name}</p>
                            <p className="text-xs text-(--color-muted)">× {part.qtyRequired} required per tent</p>
                          </div>
                          {part.qty === null ? (
                            <span className="text-xs text-(--color-muted) shrink-0">Serialized</span>
                          ) : (
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={partQtys[part.tentPartId] ?? ""}
                              onChange={e => setPartQtys(prev => ({ ...prev, [part.tentPartId]: e.target.value }))}
                              className="w-20 text-base text-center font-semibold shrink-0"
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tent-bom-price" className="text-xs uppercase tracking-wide text-(--color-muted)">
                    Rental Price ($)
                  </Label>
                  <Input
                    id="tent-bom-price"
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
                  <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Photo</Label>
                  <DashboardInventoryViewImageUpload
                    value={imageUrl}
                    onChange={setImageUrl}
                    disabled={isPending}
                    onUploadingChange={setIsUploading}
                    fallbackImageUrl={TENT_IMAGES[config.slug]}
                  />
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-(--color-muted)" />
          </div>
        )}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {bomEditMode ? (
            <>
              <Button onClick={handleSaveBOM} disabled={isBOMPending || !config} className="w-full gap-2">
                {isBOMPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isBOMPending ? "Saving…" : "Save BOM"}
              </Button>
              <Button variant="outline" onClick={cancelBOMEdit} disabled={isBOMPending} className="w-full">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} disabled={isPending || isUploading || !config} className="w-full gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? "Saving…" : isUploading ? "Uploading…" : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
                Cancel
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
