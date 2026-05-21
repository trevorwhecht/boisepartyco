// src/app/(app)/layout.tsx
import { Suspense } from "react"
import ShopHeader from "@/components/shared/layout/ShopHeader"
import { CartProvider } from "@/contexts/CartContext"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={<div style={{ height: 137, background: "#fff", borderBottom: "1px solid #e4e7ec" }} />}>
        <ShopHeader />
      </Suspense>
      <main className="flex-1">{children}</main>
    </CartProvider>
  )
}
