"use client"

import { useState, useTransition } from "react"
import { CalendarDays, Users, Trash2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { formatDateRange } from "@/lib/utils"

export type OrderCardData = {
  id: number
  token: string | null
  nickname: string | null
  stateId: number
  state: { name: string; color: string | null }
  startDate: Date | null
  endDate: Date | null
  guests: number | null
  totalPrice: any
  mainImage: string | null
  paymentPlan: string | null
  subTotal: any
  salesTax: any
  discountManual: any
  customerNotes: string | null
  createdAt: Date
  orderLineItems: Array<{
    id: number
    description: string
    qty: number
    unitPrice: any
    lineTotal: any
    notes: string | null
    item: { primaryImageUrl: string | null } | null
    tentConfig: { primaryImageUrl: string | null } | null
  }>
  setUpCosts: Array<{
    id: number
    userTotal: any
    customSetupItems: any
  }>
  payments: Array<{
    id: number
    amount: any
  }>
}

type Props = {
  order: OrderCardData
  onSelect: (order: OrderCardData) => void
  onDelete: (id: number) => void
}

export default function OrdersCard({ order, onSelect, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const thumbnail =
    order.orderLineItems[0]?.item?.primaryImageUrl ??
    order.orderLineItems[0]?.tentConfig?.primaryImageUrl ??
    null

  const dateRange = formatDateRange(order.startDate, order.endDate)
  const total = `$${Number(order.totalPrice).toFixed(2)}`
  const badgeStyle = {
    borderColor: order.state.color ?? undefined,
    color: order.state.color ?? undefined,
  }
  const label = order.nickname ?? `Order #${order.id}`
  const canDelete = order.stateId === 1

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmOpen(true)
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" })
      if (res.ok) onDelete(order.id)
    })
  }

  return (
    <>
      <div
        onClick={() => onSelect(order)}
        className="block rounded-lg border border-(--color-border) bg-(--color-background) overflow-hidden hover:bg-(--color-surface) transition-colors motion-reduce:transition-none cursor-pointer"
      >
        {/* Desktop: horizontal layout (md+) */}
        <div className="hidden md:flex items-stretch">
          <div className="w-27.5 shrink-0 bg-(--color-surface)">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-(--color-surface)" />
            )}
          </div>
          <div className="flex-1 px-4 py-3 flex flex-col gap-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-(--color-foreground) truncate">{label}</p>
                {order.nickname ? (
                  <p className="text-xs text-(--color-muted)">Order #{order.id}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" style={badgeStyle}>
                  {order.state.name}
                </Badge>
                {canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-(--color-muted) hover:text-(--color-danger) hover:bg-(--color-danger)/10"
                    onClick={handleDeleteClick}
                    aria-label="Cancel order"
                  >
                    <Trash2 size={14} />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-(--color-muted)">
              {dateRange ? (
                <span className="flex items-center gap-1">
                  <CalendarDays size={13} />
                  {dateRange}
                </span>
              ) : null}
              {order.guests ? (
                <span className="flex items-center gap-1">
                  <Users size={13} />
                  {order.guests} guests
                </span>
              ) : null}
            </div>

            <div className="space-y-0.5 border-t border-(--color-border) pt-2">
              {order.orderLineItems.map((li) => (
                <div key={li.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-(--color-foreground) truncate">{li.description}</span>
                  <span className="text-(--color-muted) shrink-0">{li.qty}×</span>
                  <span className="text-(--color-foreground) font-medium shrink-0 w-20 text-right">
                    ${Number(li.lineTotal).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold border-t border-(--color-border) pt-1.5 mt-0.5">
                <span className="text-(--color-muted)">Total</span>
                <span className="text-(--color-foreground)">{total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: stacked layout (<md) */}
        <div className="flex md:hidden flex-col">
          <div className="flex items-center justify-between px-3 pt-3 gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-(--color-foreground) text-sm truncate">{label}</p>
              {order.nickname ? (
                <p className="text-xs text-(--color-muted)">Order #{order.id}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge variant="outline" style={badgeStyle}>
                {order.state.name}
              </Badge>
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-(--color-muted) hover:text-(--color-danger) hover:bg-(--color-danger)/10"
                  onClick={handleDeleteClick}
                  aria-label="Cancel order"
                >
                  <Trash2 size={14} />
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mx-auto mt-3 w-20 h-20 rounded overflow-hidden bg-(--color-surface)">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="px-3 pb-3 pt-2 space-y-1.5">
            {dateRange ? (
              <p className="text-xs text-(--color-muted) flex items-center gap-1">
                <CalendarDays size={12} />
                {dateRange}
              </p>
            ) : null}
            {order.guests ? (
              <p className="text-xs text-(--color-muted) flex items-center gap-1">
                <Users size={12} />
                {order.guests} guests
              </p>
            ) : null}

            <div className="space-y-0.5 border-t border-(--color-border) pt-1.5">
              {order.orderLineItems.map((li) => (
                <div key={li.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-(--color-foreground) truncate">{li.description}</span>
                  <span className="text-(--color-muted) shrink-0">{li.qty}×</span>
                  <span className="text-(--color-foreground) font-medium shrink-0">
                    ${Number(li.lineTotal).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-semibold border-t border-(--color-border) pt-1.5 mt-0.5">
                <span className="text-(--color-muted)">Total</span>
                <span>{total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
