"use client"
import { createContext, useContext, useState } from "react"

interface AccountPanelContextValue {
  isOpen: boolean
  prefillEmail: string | null
  openPanel: () => void
  openPanelWithEmail: (email: string) => void
  closePanel: () => void
}

const AccountPanelContext = createContext<AccountPanelContextValue | null>(null)

export function AccountPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [prefillEmail, setPrefillEmail] = useState<string | null>(null)

  return (
    <AccountPanelContext.Provider value={{
      isOpen,
      prefillEmail,
      openPanel: () => { setPrefillEmail(null); setIsOpen(true) },
      openPanelWithEmail: (email: string) => { setPrefillEmail(email); setIsOpen(true) },
      closePanel: () => setIsOpen(false),
    }}>
      {children}
    </AccountPanelContext.Provider>
  )
}

export function useAccountPanel(): AccountPanelContextValue {
  const ctx = useContext(AccountPanelContext)
  if (!ctx) throw new Error("useAccountPanel must be used within AccountPanelProvider")
  return ctx
}
