// src/app/(public)/layout.tsx
import { Suspense } from "react"
import ShopHeader from "@/components/shared/layout/ShopHeader"
import ShopFooter from "@/components/shared/layout/ShopFooter"
import { CartProvider } from "@/contexts/CartContext"
import { DatePickerProvider } from "@/contexts/DatePickerContext"

// ShopHeader uses useSearchParams — must be in Suspense to avoid static-render errors
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <DatePickerProvider>
        <Suspense fallback={<div style={{ height: 137, background: "#fff", borderBottom: "1px solid #e4e7ec" }} />}>
          <ShopHeader />
        </Suspense>
        {children}
        <ShopFooter />
      </DatePickerProvider>
    </CartProvider>
  )
}
