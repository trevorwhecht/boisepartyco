"use client"

import { useState } from "react"
import Link from "next/link"
import OrdersCard, { type OrderCardData } from "./components/Orders-Card"
import OrdersSheet from "./components/Orders-Sheet"

type Props = { orders: OrderCardData[] }

export default function Orders({ orders: initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders)
  const [selectedOrder, setSelectedOrder] = useState<OrderCardData | null>(null)
  const current = orders.filter(o => o.stateId !== 6)
  const completed = orders.filter(o => o.stateId === 6)
  const hasBoth = current.length > 0 && completed.length > 0
  const [activeTab, setActiveTab] = useState<"current" | "completed">("current")

  function handleDelete(id: number) {
    setOrders(prev => prev.filter(o => o.id !== id))
    if (selectedOrder?.id === id) setSelectedOrder(null)
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-(--color-foreground) mb-6">My Orders</h1>
        <div className="rounded-lg border border-(--color-border) bg-(--color-background) px-4 py-12 text-center space-y-3">
          <p className="text-(--color-muted)">No orders yet.</p>
          <Link href="/quote" className="text-sm underline text-(--color-primary)">
            Start a quote
          </Link>
        </div>
      </div>
    )
  }

  const visible = hasBoth
    ? activeTab === "current" ? current : completed
    : current.length > 0 ? current : completed
  const heading = hasBoth
    ? null
    : current.length > 0 ? "Current Orders" : "Completed Orders"

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {hasBoth ? (
          <div className="flex items-center gap-1 bg-(--color-surface) rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab("current")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none touch-manipulation ${
                activeTab === "current"
                  ? "bg-(--color-background) text-(--color-foreground) shadow-sm"
                  : "text-(--color-muted) hover:text-(--color-foreground)"
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors motion-reduce:transition-none touch-manipulation ${
                activeTab === "completed"
                  ? "bg-(--color-background) text-(--color-foreground) shadow-sm"
                  : "text-(--color-muted) hover:text-(--color-foreground)"
              }`}
            >
              Completed
            </button>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-(--color-foreground)">{heading}</h1>
        )}
        <div className="space-y-3">
          {visible.map(order => (
            <OrdersCard
              key={order.id}
              order={order}
              onSelect={setSelectedOrder}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <OrdersSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => { if (!open) setSelectedOrder(null) }}
        onDelete={handleDelete}
      />
    </>
  )
}
