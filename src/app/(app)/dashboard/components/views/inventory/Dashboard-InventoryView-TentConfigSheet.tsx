"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  role: string
}

export default function DashboardInventoryViewTentConfigSheet({ config, open, onOpenChange, role }: Props) {
  const isAdmin = role === "admin"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Packing List</SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="mt-4 space-y-5 px-1">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">{config.widthFt}×{config.lengthFt} ft</p>
            </div>

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
      </SheetContent>
    </Sheet>
  )
}
