"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { CalendarDays, Users, Copy, Loader2, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
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
import { toast } from "sonner"
import { formatDateRange } from "@/lib/utils"
import type { OrderCardData } from "./Orders-Card"

type Props = {
  order: OrderCardData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (id: number) => void
}

export default function OrdersSheet({ order, open, onOpenChange, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!order) return null

  const label = order.nickname ?? `Order #${order.id}`
  const badgeStyle = { borderColor: order.state.color ?? undefined, color: order.state.color ?? undefined }
  const dateRange = formatDateRange(order.startDate, order.endDate)
  const discountManual = Number(order.discountManual ?? 0)
  const alreadyPaid = order.payments.reduce((s, p) => s + Number(p.amount), 0)
  const canDelete = order.stateId === 1

  function handleCopyLink() {
    if (!order!.token) { toast.error("No share link yet — check back once your quote is ready"); return }
    const base = window.location.origin
    navigator.clipboard.writeText(`${base}/orders/${order!.token}?name=${encodeURIComponent(label)}`)
    toast.success("Link copied")
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${order!.id}`, { method: "DELETE" })
      if (res.ok) {
        onOpenChange(false)
        onDelete(order!.id)
      } else {
        toast.error("Failed to delete order")
      }
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="bg-(--color-background) overflow-y-auto w-full sm:max-w-lg flex flex-col">
          <SheetHeader className="pb-4 border-b border-(--color-border) shrink-0">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0">
                <SheetTitle className="text-lg truncate">{label}</SheetTitle>
                <p className="text-xs text-(--color-muted) mt-0.5">
                  {order.nickname ? `Order #${order.id} · ` : ""}
                  {format(new Date(order.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <Badge variant="outline" style={badgeStyle} className="shrink-0 mt-0.5">
                {order.state.name}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm text-(--color-muted) pt-0.5 flex-wrap">
              {dateRange ? (
                <span className="flex items-center gap-1"><CalendarDays size={13} />{dateRange}</span>
              ) : null}
              {order.guests ? (
                <span className="flex items-center gap-1"><Users size={13} />{order.guests} guests</span>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 ml-auto gap-1 text-xs text-(--color-muted)"
                onClick={handleCopyLink}
              >
                <Copy size={12} /> Share
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Hero image */}
            {order.mainImage ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-(--color-surface)">
                <Image src={order.mainImage} alt={label} fill className="object-cover" unoptimized />
              </div>
            ) : null}

            {/* Customer notes */}
            {order.customerNotes ? (
              <p className="text-sm bg-(--color-surface) rounded-lg p-3 border border-(--color-border) text-(--color-foreground)">
                {order.customerNotes}
              </p>
            ) : null}

            {/* Line items */}
            {order.orderLineItems.length > 0 ? (
              <div className="border border-(--color-border) rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-(--color-border) bg-(--color-surface)">
                      <th className="text-left px-3 py-2 font-medium text-(--color-muted)">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-(--color-muted)">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-(--color-muted)">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.orderLineItems.map((li) => (
                      <tr key={li.id} className="border-b border-(--color-border) last:border-0">
                        <td className="px-3 py-2.5">
                          <p className="text-(--color-foreground)">{li.description}</p>
                          {li.notes ? <p className="text-xs text-(--color-muted) mt-0.5">{li.notes}</p> : null}
                        </td>
                        <td className="px-3 py-2.5 text-right text-(--color-muted)">{li.qty}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-(--color-foreground)">
                          ${Number(li.lineTotal).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Setup costs */}
            {order.setUpCosts.length > 0 ? (
              <div className="border border-(--color-border) rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-(--color-border) bg-(--color-surface)">
                      <th className="text-left px-3 py-2 font-medium text-(--color-muted)">Setup</th>
                      <th className="text-right px-3 py-2 font-medium text-(--color-muted)">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.setUpCosts.map((sc) => {
                      const items = sc.customSetupItems as { label: string; qty: number; rate: number }[] | null
                      const item = items?.[0]
                      return (
                        <tr key={sc.id} className="border-b border-(--color-border) last:border-0">
                          <td className="px-3 py-2.5 text-(--color-foreground)">{item?.label ?? "Setup"}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-(--color-foreground)">
                            ${Number(sc.userTotal).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Totals */}
            <div className="border border-(--color-border) rounded-lg p-3 space-y-1.5 text-sm bg-(--color-background)">
              <div className="flex justify-between">
                <span className="text-(--color-muted)">Subtotal</span>
                <span className="text-(--color-foreground)">${Number(order.subTotal).toFixed(2)}</span>
              </div>
              {discountManual > 0 ? (
                <div className="flex justify-between text-(--color-danger)">
                  <span>Discount</span>
                  <span>-${discountManual.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-(--color-muted)">Tax</span>
                <span className="text-(--color-foreground)">${Number(order.salesTax).toFixed(2)}</span>
              </div>
              {alreadyPaid > 0 ? (
                <div className="flex justify-between text-(--color-success)">
                  <span>Already Paid</span>
                  <span>-${alreadyPaid.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold text-base border-t border-(--color-border) pt-2">
                <span className="text-(--color-foreground)">Total</span>
                <span className="text-(--color-foreground)">${Number(order.totalPrice).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer — delete for Admin Review orders */}
          {canDelete ? (
            <div className="shrink-0 border-t border-(--color-border) pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                className="w-full text-(--color-danger) hover:bg-(--color-danger)/10 gap-2"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 size={15} />
                Cancel order request
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-(--color-background)">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your order request. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pb-[max(0rem,env(safe-area-inset-bottom))]">
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              autoFocus
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-(--color-danger) text-white hover:bg-(--color-danger)/90 gap-2"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? "Deleting…" : "Yes, delete it"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
