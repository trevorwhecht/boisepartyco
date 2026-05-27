"use client"

import { createContext, useContext } from "react"
import type { InventoryMode } from "@/lib/settings"

const InventoryModeContext = createContext<InventoryMode>("on")

export function InventoryModeProvider({ mode, children }: { mode: InventoryMode; children: React.ReactNode }) {
  return (
    <InventoryModeContext.Provider value={mode}>
      {children}
    </InventoryModeContext.Provider>
  )
}

export function useInventoryMode(): InventoryMode {
  return useContext(InventoryModeContext)
}
