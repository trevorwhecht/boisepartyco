"use client"

import { createContext, useContext, useState, useCallback, useTransition, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { AdminItemSummary, AdminTentConfigSummary } from "@/models/inventory"
import DashboardInventoryViewItemSheet from "@/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet"
import AdminTentBOMSheet from "@/components/shared/AdminTentBOMSheet"
import DashboardInventoryViewTentConfigSheet from "@/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet"

type ContextValue = {
  openItemEdit: (id: number) => void
  openTentEdit: (id: number) => void
  openTentView: (id: number) => void
}

const AdminQuickEditContext = createContext<ContextValue | null>(null)

export function useAdminQuickEdit() {
  return useContext(AdminQuickEditContext)
}

export function AdminQuickEditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role
  const isAdmin = role === "admin"
  const isEmployee = role === "employee"
  const isPrivileged = isAdmin || isEmployee

  const [itemData, setItemData] = useState<AdminItemSummary | null>(null)
  const [tentData, setTentData] = useState<AdminTentConfigSummary | null>(null)
  const [tentViewData, setTentViewData] = useState<AdminTentConfigSummary | null>(null)
  const [itemOpen, setItemOpen] = useState(false)
  const [tentOpen, setTentOpen] = useState(false)
  const [tentViewOpen, setTentViewOpen] = useState(false)
  const [, startTransition] = useTransition()

  const openItemEdit = useCallback((id: number) => {
    if (!isPrivileged) return
    setItemData(null)
    setItemOpen(true)
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${id}`)
      const json = await res.json()
      if (json.data) setItemData(json.data)
    })
  }, [isPrivileged])

  const openTentEdit = useCallback((id: number) => {
    if (!isAdmin) return
    setTentData(null)
    setTentOpen(true)
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${id}`)
      const json = await res.json()
      if (json.data) setTentData(json.data)
    })
  }, [isAdmin])

  const openTentView = useCallback((id: number) => {
    if (!isEmployee) return
    setTentViewData(null)
    setTentViewOpen(true)
    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/tent-configurations/${id}`)
      const json = await res.json()
      if (json.data) setTentViewData(json.data)
    })
  }, [isEmployee])

  function handleItemOpenChange(open: boolean) {
    setItemOpen(open)
    if (!open) setItemData(null)
  }

  function handleTentOpenChange(open: boolean) {
    setTentOpen(open)
    if (!open) setTentData(null)
  }

  function handleTentViewOpenChange(open: boolean) {
    setTentViewOpen(open)
    if (!open) setTentViewData(null)
  }

  function handleItemSaved(updated: AdminItemSummary) {
    setItemData(updated)
    router.refresh()
  }

  function handleTentSaved(updated: AdminTentConfigSummary) {
    setTentData(updated)
    router.refresh()
  }

  return (
    <AdminQuickEditContext.Provider value={{ openItemEdit, openTentEdit, openTentView }}>
      {children}
      {isPrivileged ? (
        <>
          <DashboardInventoryViewItemSheet
            item={itemData}
            open={itemOpen}
            onOpenChange={handleItemOpenChange}
            onSaved={handleItemSaved}
          />
          {isAdmin ? (
            <AdminTentBOMSheet
              config={tentData}
              open={tentOpen}
              onOpenChange={handleTentOpenChange}
              onSaved={handleTentSaved}
            />
          ) : null}
          {isEmployee ? (
            <DashboardInventoryViewTentConfigSheet
              config={tentViewData}
              open={tentViewOpen}
              onOpenChange={handleTentViewOpenChange}
            />
          ) : null}
        </>
      ) : null}
    </AdminQuickEditContext.Provider>
  )
}
