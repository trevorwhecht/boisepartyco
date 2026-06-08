"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { CartLine, CartLineKind } from "@/models/inventory"

type CartContextValue = {
  lines: CartLine[]
  cartCount: number
  addToCart: (refId: number, kind: CartLineKind, qty: number, name: string, unitPrice: number, imageUrl?: string | null) => void
  updateLine: (refId: number, kind: CartLineKind, qty: number) => void
  removeLine: (refId: number, kind: CartLineKind) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "bpr_cart"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setLines(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {}
  }, [lines, mounted])

  const addToCart = (refId: number, kind: CartLineKind, qty: number, name: string, unitPrice: number, imageUrl?: string | null) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.refId === refId && l.kind === kind)
      if (existing) {
        return prev.map((l) =>
          l.refId === refId && l.kind === kind
            ? { ...l, qty: l.qty + qty }
            : l,
        )
      }
      return [...prev, { kind, refId, qty, name, unitPrice, imageUrl }]
    })
  }

  const updateLine = (refId: number, kind: CartLineKind, qty: number) => {
    if (qty <= 0) {
      removeLine(refId, kind)
      return
    }
    setLines((prev) =>
      prev.map((l) => (l.refId === refId && l.kind === kind ? { ...l, qty } : l)),
    )
  }

  const removeLine = (refId: number, kind: CartLineKind) => {
    setLines((prev) => prev.filter((l) => !(l.refId === refId && l.kind === kind)))
  }

  const clearCart = () => setLines([])

  const cartCount = lines.reduce((sum, l) => sum + l.qty, 0)

  return (
    <CartContext.Provider value={{ lines, cartCount, addToCart, updateLine, removeLine, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside CartProvider")
  return ctx
}
