// src/app/(app)/layout.tsx
import { Suspense } from "react"
import ShopHeader from "@/components/shared/layout/ShopHeader"
import { CartProvider } from "@/contexts/CartContext"
import { DatePickerProvider } from "@/contexts/DatePickerContext"
import { AccountPanelProvider } from "@/contexts/AccountPanelContext"
import { InventoryModeProvider } from "@/contexts/InventoryModeContext"
import { getInventoryMode } from "@/lib/settings"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const mode = await getInventoryMode()
  return (
    <InventoryModeProvider mode={mode}>
      <CartProvider>
        <DatePickerProvider>
          <AccountPanelProvider>
            <Suspense fallback={<div style={{ height: 137, background: "#fff", borderBottom: "1px solid #e4e7ec" }} />}>
              <ShopHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
          </AccountPanelProvider>
        </DatePickerProvider>
      </CartProvider>
    </InventoryModeProvider>
  )
}
