"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { CartLine } from "@/models/inventory"

export type ConflictLine = CartLine & { available: number }

type Props = {
  open: boolean
  conflicts: ConflictLine[]
  onCancel: () => void
  onProceed: () => void
}

export function ShopHeaderConflictDialog({ open, conflicts, onCancel, onProceed }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <AlertDialogContent className="bg-(--color-background)">
        <AlertDialogHeader>
          <AlertDialogTitle>Some items aren&apos;t available for these dates</AlertDialogTitle>
          <AlertDialogDescription>
            The following items in your quote can&apos;t be fulfilled for the new dates and will be removed:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6, margin: "0 0 4px" }}>
          {conflicts.map(line => (
            <li
              key={`${line.kind}-${line.refId}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
            >
              <span style={{ fontWeight: 500 }}>{line.name}</span>
              <span style={{ color: "var(--shop-ink-soft)", whiteSpace: "nowrap" }}>
                {line.qty} in quote · {line.available} available
              </span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AlertDialogCancel onClick={onCancel}>Keep current dates</AlertDialogCancel>
          <AlertDialogAction autoFocus onClick={onProceed}>
            Remove {conflicts.length} {conflicts.length === 1 ? "item" : "items"} &amp; continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
