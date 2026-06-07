# Tent Config Role Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route tent configuration editing and viewing to the right sheet based on role — admin gets full edit (BOM qtys + price via `AdminTentBOMSheet`), employee gets read-only packing list, unauthenticated users see nothing.

**Architecture:** Four files change, no new files created. `TentConfigSheet` is simplified to a pure read-only packing list (admin branch removed — admins now always use `AdminTentBOMSheet`). `AdminQuickEditContext` gains `openTentView` for employees alongside the existing `openTentEdit` (now admin-only). `TentConfigCard` shows an always-visible Pencil for admin and Info button for employee. `TentsTab` swaps from `TentConfigSheet` to `AdminTentBOMSheet` for admin config clicks and re-fetches both parts and configs after an admin save (since BOM qty edits affect `canBuild` across all configs).

**Tech Stack:** Next.js App Router · React 19 · TypeScript · shadcn/ui · Tailwind 4

---

## File Map

| File | Change |
|---|---|
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx` | Strip to read-only packing list — remove role, onSaved, admin branch, price edit, save footer |
| `src/contexts/AdminQuickEditContext.tsx` | Add `openTentView` for employees; restrict `openTentEdit` to admin-only; render TentConfigSheet for employee views |
| `src/components/shared/TentConfigCard.tsx` | Always-visible button; Pencil→`openTentEdit` for admin; Info→`openTentView` for employee; no button for users |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx` | `AdminTentBOMSheet` for admin config clicks; `TentConfigSheet` for employee; `handleAdminConfigSaved` re-fetches parts + configs |

---

## Task 1: Simplify TentConfigSheet to Read-Only Packing List

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentConfigSheet.tsx`

The current component has an admin branch with a price edit input, a save footer, and role-based conditional rendering throughout. Since admins now always use `AdminTentBOMSheet`, all of that is dead code. This task replaces the entire file with a clean, stateless packing list.

- [ ] **Step 1: Replace the entire file**

Write the following as the complete file contents:

```tsx
"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import type { AdminTentConfigSummary } from "@/models/inventory"

type Props = {
  config: AdminTentConfigSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function DashboardInventoryViewTentConfigSheet({ config, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Packing List</SheetTitle>
        </SheetHeader>

        {config ? (
          <div className="flex-1 space-y-5 mt-4 px-1 overflow-y-auto">
            <div>
              <p className="text-sm font-semibold text-(--color-foreground)">{config.name}</p>
              <p className="text-xs text-(--color-muted)">{config.widthFt}×{config.lengthFt} ft</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-(--color-muted) mb-2">Parts required × 1 tent</p>
              {config.bomParts.length === 0 ? (
                <p className="text-sm text-(--color-muted)">No parts defined yet.</p>
              ) : (
                <ul className="space-y-2">
                  {config.bomParts.map(part => (
                    <li
                      key={part.tentPartId}
                      className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-2 text-sm"
                    >
                      <span className="text-(--color-foreground)">{part.name}</span>
                      <span className="font-bold text-(--color-foreground)">× {part.qtyRequired}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!config.bomComplete ? (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                ⚠ BOM incomplete
              </Badge>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify type check passes for this file**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep "TentConfigSheet"
```

Expected: errors in `TentsTab.tsx` (it still passes `onSaved` and `role` to the old signature — that's fine, it gets fixed in Task 4). No errors inside `TentConfigSheet` itself.

---

## Task 2: Update AdminQuickEditContext — Add openTentView, Restrict openTentEdit to Admin

**Files:**
- Modify: `src/contexts/AdminQuickEditContext.tsx`

Currently `openTentEdit` allows any privileged user (admin or employee). This task restricts it to admin-only and adds `openTentView` for employees, which fetches the same config data but opens the read-only `TentConfigSheet`.

- [ ] **Step 1: Replace the entire file**

```tsx
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
```

- [ ] **Step 2: Verify type check passes for this file**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep "AdminQuickEditContext"
```

Expected: no errors in this file. Any errors in files that consume `useAdminQuickEdit()` will surface in Task 3 (TentConfigCard now needs `openTentView`).

---

## Task 3: Update TentConfigCard — Always-Visible Button, Pencil for Admin, Info for Employee

**Files:**
- Modify: `src/components/shared/TentConfigCard.tsx`

Currently a single Pencil button renders for any privileged user with `md:opacity-0 md:group-hover:opacity-100` (hidden until hover on desktop). This task splits it into role-specific buttons that are always visible and calls the correct context function for each role.

- [ ] **Step 1: Update imports — add Info icon**

Find the lucide-react import line:
```tsx
import { AlertTriangle, Pencil, Plus } from "lucide-react"
```
Change to:
```tsx
import { AlertTriangle, Info, Pencil, Plus } from "lucide-react"
```

- [ ] **Step 2: Replace the isPrivileged role check with split variables**

Find:
```tsx
  const isPrivileged = session?.user?.role === "admin" || session?.user?.role === "employee"
```
Replace with:
```tsx
  const role = session?.user?.role
  const isAdmin = role === "admin"
  const isEmployee = role === "employee"
```

- [ ] **Step 3: Replace the single button with role-specific buttons**

Find the entire button block inside the image overlay:
```tsx
        {isPrivileged ? (
          <button
            type="button"
            onClick={() => quickEdit?.openTentEdit(config.id)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-(--color-border) p-1.5 text-(--color-muted) hover:text-(--color-foreground) transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
            aria-label="Edit tent BOM"
          >
            <Pencil size={12} />
          </button>
        ) : null}
```
Replace with:
```tsx
        {isAdmin ? (
          <button
            type="button"
            onClick={() => quickEdit?.openTentEdit(config.id)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-(--color-border) p-1.5 text-(--color-muted) hover:text-(--color-foreground) transition-colors"
            aria-label="Edit tent"
          >
            <Pencil size={12} />
          </button>
        ) : isEmployee ? (
          <button
            type="button"
            onClick={() => quickEdit?.openTentView(config.id)}
            className="absolute top-2 right-2 z-10 rounded-full bg-white/90 border border-(--color-border) p-1.5 text-(--color-muted) hover:text-(--color-foreground) transition-colors"
            aria-label="View packing list"
          >
            <Info size={12} />
          </button>
        ) : null}
```

- [ ] **Step 4: Verify type check passes for this file**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep "TentConfigCard"
```

Expected: no errors.

---

## Task 4: Update TentsTab — AdminTentBOMSheet for Admin, TentConfigSheet for Employee

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx`

Currently all config clicks open `DashboardInventoryViewTentConfigSheet` regardless of role, and `handleConfigSaved` only updates configs in state. This task wires admin clicks to `AdminTentBOMSheet` (which can edit BOM qtys + price), keeps `TentConfigSheet` for employees, and adds `handleAdminConfigSaved` which re-fetches both parts and all configs (since saving BOM part qtys changes stock counts, which affects `canBuild` across all configurations).

- [ ] **Step 1: Add AdminTentBOMSheet import**

Find the existing import block at the top of the file. After:
```tsx
import DashboardInventoryViewTentPartSheet from "./Dashboard-InventoryView-TentPartSheet"
import DashboardInventoryViewTentConfigSheet from "./Dashboard-InventoryView-TentConfigSheet"
```
Add:
```tsx
import AdminTentBOMSheet from "@/components/shared/AdminTentBOMSheet"
```

- [ ] **Step 2: Replace handleConfigSaved with handleAdminConfigSaved**

Find and remove the existing `handleConfigSaved` function:
```tsx
  function handleConfigSaved(updated: AdminTentConfigSummary) {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c))
  }
```
Replace with:
```tsx
  async function handleAdminConfigSaved(_updated: AdminTentConfigSummary) {
    const [partsRes, configsRes] = await Promise.all([
      fetch("/api/admin/inventory/tent-parts").then(r => r.json()),
      fetch("/api/admin/inventory/tent-configurations").then(r => r.json()),
    ])
    if (partsRes.data) setParts(partsRes.data)
    if (configsRes.data) setConfigs(configsRes.data)
  }
```

- [ ] **Step 3: Replace the config sheet render at the bottom of the component**

Find:
```tsx
      <DashboardInventoryViewTentConfigSheet
        config={selectedConfig}
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        onSaved={handleConfigSaved}
        role={role}
      />
```
Replace with:
```tsx
      {isAdmin ? (
        <AdminTentBOMSheet
          config={selectedConfig}
          open={configSheetOpen}
          onOpenChange={setConfigSheetOpen}
          onSaved={handleAdminConfigSaved}
        />
      ) : (
        <DashboardInventoryViewTentConfigSheet
          config={selectedConfig}
          open={configSheetOpen}
          onOpenChange={setConfigSheetOpen}
        />
      )}
```

- [ ] **Step 4: Run full type check — expect zero errors in touched files**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep -v "\.next/types/validator" | grep "error TS"
```

Expected: no output (zero errors). Fix any that appear before continuing.

---

## Task 5: Verify End-to-End

- [ ] **Step 1: Start dev server**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npm run dev
```

- [ ] **Step 2: Verify admin flow on /tents**

Log in as admin. Go to `/tents`. Confirm:
- The Pencil button is visible on every tent card without hovering
- Clicking Pencil opens `AdminTentBOMSheet` with BOM part qtys + price edit
- Saving updates the card price and `canBuild` on all configurations

- [ ] **Step 3: Verify employee flow on /tents**

Log in as employee. Go to `/tents`. Confirm:
- An Info button is visible on every tent card (not Pencil)
- Clicking Info opens the read-only Packing List sheet
- No price edit input or save button appears in the sheet

- [ ] **Step 4: Verify user flow on /tents**

Log out (or use a customer account). Go to `/tents`. Confirm:
- No button appears on tent cards

- [ ] **Step 5: Verify admin flow in inventory dashboard**

Log in as admin. Go to Dashboard → Inventory → Tent tab → Configurations. Confirm:
- Clicking a config row opens `AdminTentBOMSheet` (full edit with BOM qtys + price)
- Saving re-fetches parts AND all configurations (canBuild updates)

- [ ] **Step 6: Verify employee flow in inventory dashboard**

Log in as employee. Go to Dashboard → Inventory → Tent tab → Configurations. Confirm:
- Clicking a config row opens the read-only Packing List sheet
- No edit inputs or save button visible
