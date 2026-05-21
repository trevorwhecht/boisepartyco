# Unified Calendar & Cart Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the duplicate calendar pickers into one nav-controlled picker, show real inventory stock without dates, gate add-to-cart on date selection, and validate cart items when dates change.

**Architecture:** A new `DatePickerContext` owns open/message state for the nav's `DateRangePicker`. Every calendar entry point (hero button, add-to-cart without dates) calls `openPicker()` from context instead of rendering a second picker. Date changes in `ShopHeader` check the availability API before applying when the cart has items, presenting an `AlertDialog` for conflicts. Tent config stock without dates uses a new `getBulkTentConfigBuildableCount` (1–2 DB queries total) instead of N individual calls.

**Tech Stack:** Next.js App Router, React 19, Prisma, Tailwind 4, shadcn/ui (base-ui), TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/contexts/DatePickerContext.tsx` | **Create** | Shared open/message state for the single nav calendar |
| `src/components/shared/layout/ShopHeader-ConflictDialog.tsx` | **Create** | AlertDialog shown when cart items conflict with new dates |
| `src/components/shared/DateRangePicker.tsx` | **Modify** | Add `message` prop rendered above the calendar months |
| `src/components/shared/DateRangeField.tsx` | **Modify** | Add controlled mode: `externalOpen`, `onExternalChange`, `message` |
| `src/app/(public)/layout.tsx` | **Modify** | Mount `DatePickerProvider` |
| `src/components/shared/layout/ShopHeader.tsx` | **Modify** | Wire DatePickerContext; async conflict check on date change |
| `src/app/(public)/Home-Hero.tsx` | **Modify** | Replace both `DateRangeField` instances with context-driven buttons |
| `src/services/inventoryService.ts` | **Modify** | Add `getBulkTentConfigBuildableCount` (bulk, 1–2 queries) |
| `src/app/(public)/tents/page.tsx` | **Modify** | Use `getBulkTentConfigBuildableCount` when `!hasRange` |
| `src/components/shared/CategoryListing.tsx` | **Modify** | Gate `onAdd` — open picker with message when no dates selected |

> **No new tests required.** All new code is either UI state management (context, dialog) or a DB-service wrapper. The pure calculation it relies on (`calcBuildableFromParts`) is already tested in `src/lib/availability.test.ts`.

---

### Task 1: DatePickerContext

**Files:**
- Create: `src/contexts/DatePickerContext.tsx`

- [ ] Create `src/contexts/DatePickerContext.tsx` with this exact content:

```tsx
// src/contexts/DatePickerContext.tsx
"use client"

import { createContext, useContext, useState, useCallback } from "react"

type DatePickerContextValue = {
  isOpen: boolean
  message: string | null
  openPicker: (message?: string) => void
  closePicker: () => void
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

export function DatePickerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const openPicker = useCallback((msg?: string) => {
    setMessage(msg ?? null)
    setIsOpen(true)
  }, [])

  const closePicker = useCallback(() => {
    setIsOpen(false)
    setMessage(null)
  }, [])

  return (
    <DatePickerContext.Provider value={{ isOpen, message, openPicker, closePicker }}>
      {children}
    </DatePickerContext.Provider>
  )
}

export function useDatePicker() {
  const ctx = useContext(DatePickerContext)
  if (!ctx) throw new Error("useDatePicker must be used inside DatePickerProvider")
  return ctx
}
```

- [ ] Commit:
```bash
git add src/contexts/DatePickerContext.tsx
git commit -m "feat: add DatePickerContext for unified calendar control"
```

---

### Task 2: DateRangePicker — message prop

**Files:**
- Modify: `src/components/shared/DateRangePicker.tsx`

- [ ] Add `message?: string | null` to the `Props` type (line 10–17):

```ts
type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  onClose?: () => void
  anchorRect?: DOMRect | null
  inline?: boolean
  message?: string | null
}
```

- [ ] Update the function signature on line 104 to destructure `message`:

```tsx
export default function DateRangePicker({ start, end, onChange, onClose, anchorRect, inline, message }: Props) {
```

- [ ] Add the message banner inside the outer `<div>` wrapper (line ~186), immediately before the months flex container `<div style={{ display: "flex", gap: isMobile ? 0 : 28 }}>`:

```tsx
{message ? (
  <div style={{
    marginBottom: 12,
    padding: "10px 14px",
    background: "#fdf3e2",
    border: "1px solid #f0d078",
    borderRadius: 8,
    fontSize: 13,
    color: "#a26b1d",
    fontWeight: 500,
  }}>
    {message}
  </div>
) : null}
```

- [ ] Commit:
```bash
git add src/components/shared/DateRangePicker.tsx
git commit -m "feat: add message prop to DateRangePicker for contextual prompts"
```

---

### Task 3: DateRangeField — controlled mode

**Files:**
- Modify: `src/components/shared/DateRangeField.tsx`

- [ ] Replace the entire file with the following (the logic change is: controlled mode via `externalOpen`/`onExternalChange`/`message`; all original styles are preserved):

```tsx
// src/components/shared/DateRangeField.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar } from "lucide-react"
import DateRangePicker, { type DateRange } from "./DateRangePicker"
import { fmtRangeShort, daysBetween } from "@/lib/availability"

type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  compact?: boolean
  dark?: boolean
  fullWidth?: boolean
  // Controlled mode — when provided, DatePickerContext owns open state
  externalOpen?: boolean
  onExternalChange?: (open: boolean) => void
  message?: string | null
}

export default function DateRangeField({
  start, end, onChange,
  compact, dark, fullWidth,
  externalOpen, onExternalChange, message,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const isControlled = externalOpen !== undefined
  const showPicker = isControlled ? externalOpen : open

  // When opened externally (hero button or add-to-cart), capture anchor rect
  useEffect(() => {
    if (externalOpen && ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect())
    }
  }, [externalOpen])

  const close = () => {
    if (isControlled) onExternalChange?.(false)
    else setOpen(false)
  }

  const toggle = () => {
    if (ref.current) setAnchorRect(ref.current.getBoundingClientRect())
    if (isControlled) {
      onExternalChange?.(!externalOpen)
    } else {
      setOpen((o) => !o)
    }
  }

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest("[data-cal-pop]") || target.closest("[data-cal-trigger]")) return
      close()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showPicker, isControlled, externalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = start && end
    ? fmtRangeShort(start, end)
    : start
    ? `${fmtRangeShort(start, start).split(",")[0]} – pick end`
    : "Pick event dates"

  const style: React.CSSProperties = compact ? {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 14px", borderRadius: 999,
    background: dark ? "rgba(255,255,255,0.12)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : "#e4e7ec"}`,
    color: dark ? "#fff" : "#1a2433",
    fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
    width: fullWidth ? "100%" : undefined,
  } : {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "14px 22px", borderRadius: 8,
    background: "#fff", border: "1px solid #e4e7ec",
    color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
  }

  return (
    <>
      <button type="button" data-cal-trigger ref={ref} onClick={toggle} style={style}>
        <Calendar size={compact ? 14 : 16} />
        <span style={{ fontWeight: 500 }}>{label}</span>
        {start && end && compact ? (
          <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>
            {daysBetween(start, end)}d
          </span>
        ) : null}
      </button>
      {showPicker ? (
        <DateRangePicker
          start={start}
          end={end}
          onChange={onChange}
          onClose={close}
          anchorRect={anchorRect}
          message={message}
        />
      ) : null}
    </>
  )
}
```

- [ ] Commit:
```bash
git add src/components/shared/DateRangeField.tsx
git commit -m "feat: add controlled mode to DateRangeField (externalOpen/onExternalChange/message)"
```

---

### Task 4: Public layout — mount DatePickerProvider

**Files:**
- Modify: `src/app/(public)/layout.tsx`

- [ ] Replace the file content:

```tsx
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
```

- [ ] Commit:
```bash
git add src/app/(public)/layout.tsx
git commit -m "feat: mount DatePickerProvider in public layout"
```

---

### Task 5: ShopHeader-ConflictDialog

**Files:**
- Create: `src/components/shared/layout/ShopHeader-ConflictDialog.tsx`

- [ ] Create `src/components/shared/layout/ShopHeader-ConflictDialog.tsx`:

```tsx
// src/components/shared/layout/ShopHeader-ConflictDialog.tsx
"use client"

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
import type { CartLine } from "@/models/inventory"

export type ConflictLine = CartLine & { available: number }

type Props = {
  open: boolean
  conflicts: ConflictLine[]
  onCancel: () => void
  onProceed: () => void
}

export function ShopHeaderConflictDialog({ open, conflicts, onCancel, onProceed }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <AlertDialogContent className="bg-(--color-background) text-(--color-foreground) ring-(--color-border)">
        <AlertDialogHeader>
          <AlertDialogTitle>Some items aren&apos;t available for these dates</AlertDialogTitle>
          <AlertDialogDescription style={{ color: "var(--shop-ink-soft)" }}>
            The following items in your quote can&apos;t be fully fulfilled for the selected dates and will be removed:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 8, margin: "-4px 0 4px" }}>
          {conflicts.map(line => (
            <li
              key={`${line.kind}-${line.refId}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
            >
              <span style={{ color: "var(--shop-ink)", fontWeight: 500 }}>{line.name}</span>
              <span style={{ color: "var(--shop-ink-soft)", whiteSpace: "nowrap" }}>
                {line.qty} in quote &middot; {line.available} available
              </span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AlertDialogCancel onClick={onCancel}>Keep current dates</AlertDialogCancel>
          <AlertDialogAction autoFocus onClick={onProceed}>
            Remove {conflicts.length} {conflicts.length === 1 ? "item" : "items"} &amp; continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] Commit:
```bash
git add src/components/shared/layout/ShopHeader-ConflictDialog.tsx
git commit -m "feat: add ShopHeaderConflictDialog for date-change cart conflicts"
```

---

### Task 6: ShopHeader — wire DatePickerContext and conflict check

**Files:**
- Modify: `src/components/shared/layout/ShopHeader.tsx`

- [ ] Replace the entire file with the following. Key changes from original: (1) `useDatePicker()` added, (2) `lines` + `removeLine` destructured from `useCart()`, (3) `handleDateChange` is now async with conflict check, (4) `applyDates`/`handleConflictProceed`/`handleConflictCancel` added, (5) `DateRangeField` receives controlled props, (6) `ShopHeaderConflictDialog` rendered before `</header>`.

```tsx
// src/components/shared/layout/ShopHeader.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Phone, Menu, X, UserRound } from "lucide-react"
import { useState, useEffect } from "react"
import DateRangeField from "@/components/shared/DateRangeField"
import { useCart } from "@/contexts/CartContext"
import { useDatePicker } from "@/contexts/DatePickerContext"
import Logo from "@/components/shared/layout/Logo"
import NavbarAccountPanel from "@/components/shared/layout/Navbar-AccountPanel"
import NavbarNotificationBell from "@/components/shared/layout/Navbar-NotificationBell"
import { ShopHeaderConflictDialog, type ConflictLine } from "@/components/shared/layout/ShopHeader-ConflictDialog"
import type { DateRange } from "@/components/shared/DateRangePicker"
import { parseLocalDate, fmtLocalDate } from "@/lib/availability"

const NAV = [
  { href: "/", label: "Home", match: ["/"], navClass: "hidden xl:flex" },
  { href: "/tents", label: "Tents", match: ["/tents"], navClass: "" },
  { href: "/tables-and-chairs", label: "Tables & Chairs", match: ["/tables-and-chairs"], navClass: "" },
  { href: "/decor", label: "Decor & Dance Floor", match: ["/decor"], navClass: "" },
  { href: "/faq", label: "FAQ", match: ["/faq"], navClass: "" },
  { href: "/contact", label: "Contact", match: ["/contact"], navClass: "hidden lg:flex" },
]

export default function ShopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cartCount, lines, removeLine } = useCart()
  const { isOpen: datePickerOpen, openPicker, closePicker, message: datePickerMessage } = useDatePicker()
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [pendingDates, setPendingDates] = useState<{ s: Date; e: Date } | null>(null)
  const [conflicts, setConflicts] = useState<ConflictLine[]>([])

  const showDateAndQuote = !pathname.startsWith("/dashboard")

  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const start = fromStr ? parseLocalDate(fromStr) : null
  const end = toStr ? parseLocalDate(toStr) : null

  // Restore dates from localStorage when URL loses them (e.g. navigating to a page with no ?from=&to=)
  useEffect(() => {
    const fromInUrl = searchParams.get("from")
    const toInUrl = searchParams.get("to")
    if (fromInUrl || toInUrl) return

    try {
      const saved = localStorage.getItem("bpr_dates")
      if (!saved) return
      const { from, to } = JSON.parse(saved) as { from?: string; to?: string }
      if (!from) return
      const params = new URLSearchParams(searchParams.toString())
      params.set("from", from)
      if (to) params.set("to", to)
      router.replace(`${pathname}?${params.toString()}`)
    } catch {
      // ignore malformed localStorage data
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyDates(s: Date, e: Date) {
    const from = fmtLocalDate(s)
    const to = fmtLocalDate(e)
    const params = new URLSearchParams(searchParams.toString())
    params.set("from", from)
    params.set("to", to)
    localStorage.setItem("bpr_dates", JSON.stringify({ from, to }))
    router.replace(`${pathname}?${params.toString()}`)
    closePicker()
  }

  async function handleDateChange({ start: s, end: e }: DateRange) {
    // Clear
    if (!s) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("from")
      params.delete("to")
      localStorage.removeItem("bpr_dates")
      router.replace(`${pathname}?${params.toString()}`)
      return
    }

    // Partial selection (start only) — update URL immediately, no conflict check needed
    if (!e) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("from", fmtLocalDate(s))
      params.delete("to")
      localStorage.setItem("bpr_dates", JSON.stringify({ from: fmtLocalDate(s) }))
      router.replace(`${pathname}?${params.toString()}`)
      return
    }

    // Complete range with empty cart — apply immediately
    if (lines.length === 0) {
      applyDates(s, e)
      return
    }

    // Complete range with cart items — check availability before applying
    const itemIds = lines.filter(l => l.kind === "item").map(l => l.refId)
    const configIds = lines.filter(l => l.kind === "tentConfig").map(l => l.refId)

    const url = new URL("/api/inventory/availability", window.location.origin)
    if (itemIds.length) url.searchParams.set("itemIds", itemIds.join(","))
    if (configIds.length) url.searchParams.set("configIds", configIds.join(","))
    url.searchParams.set("from", fmtLocalDate(s))
    url.searchParams.set("to", fmtLocalDate(e))

    try {
      const res = await fetch(url.toString())
      const { data } = await res.json() as {
        data: {
          items: Record<string, { available: number }>
          configs: Record<string, { available: number }>
        }
      }

      const conflictLines: ConflictLine[] = lines
        .map(line => {
          const avail = line.kind === "item"
            ? (data.items[String(line.refId)]?.available ?? 0)
            : (data.configs[String(line.refId)]?.available ?? 0)
          return { ...line, available: avail }
        })
        .filter(line => line.qty > line.available)

      if (conflictLines.length === 0) {
        applyDates(s, e)
        return
      }

      // Show conflict dialog — dates not applied until user confirms
      setPendingDates({ s, e })
      setConflicts(conflictLines)
    } catch {
      // On fetch error, apply dates anyway — server re-validates on order submit
      applyDates(s, e)
    }
  }

  function handleConflictProceed() {
    conflicts.forEach(line => removeLine(line.refId, line.kind))
    if (pendingDates) applyDates(pendingDates.s, pendingDates.e)
    setPendingDates(null)
    setConflicts([])
  }

  function handleConflictCancel() {
    setPendingDates(null)
    setConflicts([])
  }

  function closeAll() {
    setNavOpen(false)
    setAccountOpen(false)
  }

  function navigate(href: string) {
    closeAll()
    router.push(href)
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#fff",
        borderBottom: "1px solid var(--shop-line)",
      }}
    >
      {/* Backdrop — closes any open panel on outside click */}
      {(navOpen || accountOpen) ? (
        <div className="fixed inset-0 z-30" onClick={closeAll} />
      ) : null}

      {/* ── Utility bar — desktop only ────────────────────── */}
      <div className="hidden md:block" style={{ background: "var(--shop-blue-deep)", color: "#fff", fontSize: 12.5, padding: "6px 0" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://www.facebook.com/p/Boise-Party-Co-61553003512499/" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }} aria-label="Facebook">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/boisepartyco/" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }} aria-label="Instagram">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85 }}>Serving Boise, Meridian, Eagle & the Treasure Valley</span>
          </div>
          <a
            href="tel:+12083063079"
            style={{ color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}
            aria-label="Call (208) 306-3079"
          >
            <Phone size={12} />
            (208) 306-3079
          </a>
        </div>
      </div>

      {/* ── Main nav area (relative so drawer positions from here) ── */}
      <div style={{ position: "relative" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 16px" }}>

          {/* Top row */}
          <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

            {/* Left group: hamburger (mobile) + logo (desktop) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="md:hidden flex items-center justify-center"
                style={{
                  minHeight: 44, minWidth: 44,
                  borderRadius: 8, background: "none", border: "none",
                  cursor: "pointer", color: "var(--shop-ink)", touchAction: "manipulation",
                }}
                onClick={() => { setNavOpen(p => !p); setAccountOpen(false) }}
                aria-label={navOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={navOpen}
              >
                <div style={{ position: "relative", width: 20, height: 20 }}>
                  <Menu style={{
                    position: "absolute", inset: 0, width: 20, height: 20,
                    transition: "opacity 0.2s, transform 0.2s",
                    opacity: navOpen ? 0 : 1,
                    transform: navOpen ? "rotate(90deg) scale(0.75)" : "none",
                  }} />
                  <X style={{
                    position: "absolute", inset: 0, width: 20, height: 20,
                    transition: "opacity 0.2s, transform 0.2s",
                    opacity: navOpen ? 1 : 0,
                    transform: navOpen ? "none" : "rotate(-90deg) scale(0.75)",
                  }} />
                </div>
              </button>

              <div className="hidden md:block">
                <Logo onClick={closeAll} />
              </div>
            </div>

            {/* Logo — mobile: perfectly centered via absolute */}
            <div
              className="md:hidden"
              style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto" }}
            >
              <Logo size="sm" onClick={closeAll} />
            </div>

            {/* Desktop nav links — centered flex */}
            <nav
              className="hidden md:flex"
              style={{ flex: 1, justifyContent: "center", gap: 24, alignItems: "center" }}
            >
              {NAV.map((n) => {
                const active = n.match.includes(pathname)
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={closeAll}
                    className={n.navClass}
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: active ? "var(--shop-blue)" : "var(--shop-ink)",
                      paddingBottom: 4,
                      borderBottom: active ? "2px solid var(--shop-blue)" : "2px solid transparent",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right group: desktop (date + quote) + account icon (both) */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {showDateAndQuote ? (
                <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
                  <DateRangeField
                    start={start}
                    end={end}
                    onChange={handleDateChange}
                    compact
                    externalOpen={datePickerOpen}
                    onExternalChange={(open) => open ? openPicker() : closePicker()}
                    message={datePickerMessage}
                  />
                  <QuoteButton cartCount={cartCount} onClick={closeAll} />
                </div>
              ) : null}

              <NavbarNotificationBell />

              <button
                style={{
                  minHeight: 44, minWidth: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 8, background: "none", border: "none",
                  cursor: "pointer", color: "var(--shop-ink)", touchAction: "manipulation",
                }}
                onClick={() => { setAccountOpen(p => !p); setNavOpen(false) }}
                aria-label={accountOpen ? "Close account menu" : "Open account menu"}
                aria-expanded={accountOpen}
              >
                <div style={{ position: "relative", width: 20, height: 20 }}>
                  <UserRound style={{
                    position: "absolute", inset: 0, width: 20, height: 20,
                    transition: "opacity 0.2s, transform 0.2s",
                    opacity: accountOpen ? 0 : 1,
                    transform: accountOpen ? "rotate(90deg) scale(0.75)" : "none",
                  }} />
                  <X style={{
                    position: "absolute", inset: 0, width: 20, height: 20,
                    transition: "opacity 0.2s, transform 0.2s",
                    opacity: accountOpen ? 1 : 0,
                    transform: accountOpen ? "none" : "rotate(-90deg) scale(0.75)",
                  }} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile action row: date picker + quote button (full width) */}
          {showDateAndQuote ? (
            <div
              className="md:hidden flex items-center"
              style={{ gap: 10, paddingBottom: 12 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <DateRangeField
                  start={start}
                  end={end}
                  onChange={handleDateChange}
                  compact
                  fullWidth
                  externalOpen={datePickerOpen}
                  onExternalChange={(open) => open ? openPicker() : closePicker()}
                  message={datePickerMessage}
                />
              </div>
              <QuoteButton cartCount={cartCount} onClick={closeAll} />
            </div>
          ) : null}
        </div>

        {/* Mobile nav drawer */}
        <div
          className="md:hidden"
          aria-hidden={!navOpen}
          inert={!navOpen ? true : undefined}
          style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            background: "#fff",
            borderBottom: "1px solid var(--shop-line)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 40,
            transition: "opacity 0.2s, transform 0.2s",
            opacity: navOpen ? 1 : 0,
            transform: navOpen ? "translateY(0)" : "translateY(-6px)",
            pointerEvents: navOpen ? "auto" : "none",
          }}
        >
          <nav style={{ padding: "8px 0" }}>
            {NAV.map((n) => {
              const active = n.match.includes(pathname)
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={closeAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "13px 20px",
                    fontSize: 15,
                    fontWeight: 500,
                    color: active ? "var(--shop-blue)" : "var(--shop-ink)",
                    textDecoration: "none",
                    background: active ? "var(--shop-blue-soft)" : "transparent",
                    touchAction: "manipulation",
                  }}
                >
                  {n.label}
                </Link>
              )
            })}

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              marginTop: 4,
              borderTop: "1px solid var(--shop-line)",
            }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <a
                  href="https://www.facebook.com/p/Boise-Party-Co-61553003512499/"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--shop-ink-soft)", display: "flex", minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "flex-start", touchAction: "manipulation" }}
                  aria-label="Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/boisepartyco/"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--shop-ink-soft)", display: "flex", minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "flex-start", touchAction: "manipulation" }}
                  aria-label="Instagram"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                  </svg>
                </a>
              </div>
              <a
                href="tel:+12083063079"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "var(--shop-blue)", fontWeight: 600, fontSize: 14,
                  textDecoration: "none", touchAction: "manipulation",
                  minHeight: 44,
                }}
                aria-label="Call (208) 306-3079"
              >
                <Phone size={16} />
                (208) 306-3079
              </a>
            </div>
          </nav>
        </div>
      </div>

      {/* Account panel */}
      <NavbarAccountPanel isOpen={accountOpen} onClose={closeAll} navigate={navigate} />

      {/* Date-change conflict dialog */}
      <ShopHeaderConflictDialog
        open={pendingDates !== null}
        conflicts={conflicts}
        onCancel={handleConflictCancel}
        onProceed={handleConflictProceed}
      />
    </header>
  )
}

function QuoteButton({ cartCount, onClick }: { cartCount: number; onClick: () => void }) {
  return (
    <Link
      href="/quote"
      onClick={onClick}
      style={{
        minHeight: 44,
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 999,
        background: "var(--shop-blue)",
        color: "#fff",
        fontSize: 13.5,
        fontWeight: 600,
        textDecoration: "none",
        flexShrink: 0,
        touchAction: "manipulation",
      }}
    >
      <ShoppingCart size={14} />
      Quote
      {cartCount > 0 ? (
        <span style={{
          background: "#fff",
          color: "var(--shop-blue)",
          borderRadius: 999,
          padding: "1px 8px",
          fontSize: 11,
          fontWeight: 700,
        }}>
          {cartCount}
        </span>
      ) : null}
    </Link>
  )
}
```

- [ ] Verify the dev server compiles without errors:
```bash
npm run dev
```
Expected: no TypeScript or compilation errors in the terminal.

- [ ] Commit:
```bash
git add src/components/shared/layout/ShopHeader.tsx
git commit -m "feat: wire DatePickerContext into ShopHeader, add date-change conflict validation"
```

---

### Task 7: Home-Hero — use context button

**Files:**
- Modify: `src/app/(public)/Home-Hero.tsx`

- [ ] Replace the entire file. The `DateRangeField` in both mobile and desktop slots is replaced with a plain `<button>` that calls `openPicker()`. `useRouter` and `handleChange` are removed since date changes are now handled exclusively by `ShopHeader`.

```tsx
// src/app/(public)/Home-Hero.tsx
"use client"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { ArrowRight, Calendar } from "lucide-react"
import { useDatePicker } from "@/contexts/DatePickerContext"
import { parseLocalDate, fmtRangeShort } from "@/lib/availability"

function dateLabel(from: string | null, to: string | null): string {
  const start = from ? parseLocalDate(from) : null
  const end = to ? parseLocalDate(to) : null
  if (start && end) return fmtRangeShort(start, end)
  if (start) return `${fmtRangeShort(start, start).split(",")[0]} – pick end`
  return "Pick event dates"
}

export default function HomeHero() {
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const { openPicker } = useDatePicker()
  const label = dateLabel(from, to)

  return (
    <section className="relative overflow-hidden" style={{ minHeight: 480, height: "clamp(480px, 60vw, 640px)" }}>
      <Image
        src="/images/heroes/home-hero.webp"
        alt="Boise Party Co. — event rentals in the Treasure Valley"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,18,38,0.20) 0%, rgba(10,18,38,0.58) 65%, rgba(10,18,38,0.78) 100%)",
        }}
      />

      <div className="relative max-w-330 mx-auto px-4 md:px-8 pt-16 md:pt-32 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80 mb-4">
          Boise · Meridian · Eagle · Nampa
        </p>
        <h1
          className="serif font-medium leading-[1.05] tracking-tight max-w-220"
          style={{ fontSize: "clamp(36px, 8vw, 76px)", textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
        >
          Rentals for <em className="italic">every occasion</em><br />in the Treasure Valley.
        </h1>
        <p className="mt-4 md:mt-5 text-base md:text-lg text-white/90 max-w-lg leading-relaxed">
          Tents, tables, dance floors, and the small details. Check live availability for your weekend and reserve in minutes.
        </p>
        <div
          className="mt-8 md:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:p-2.5 sm:bg-white/95 sm:rounded-full"
          style={{ boxShadow: "0 14px 40px -10px rgba(0,0,0,0.45)" }}
        >
          {/* Mobile: stacked buttons */}
          <div className="sm:hidden flex flex-col gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={openPicker}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#fff",
                fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", width: "100%",
                touchAction: "manipulation",
              }}
            >
              <Calendar size={14} />
              <span style={{ fontWeight: 500 }}>{label}</span>
            </button>
            <a
              href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              See what&apos;s available <ArrowRight size={14} />
            </a>
          </div>

          {/* Desktop: pill with date inside */}
          <div className="hidden sm:flex items-center gap-3.5">
            <button
              type="button"
              onClick={openPicker}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                padding: "14px 22px", borderRadius: 8,
                background: "#fff", border: "1px solid #e4e7ec",
                color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                touchAction: "manipulation",
              }}
            >
              <Calendar size={16} />
              <span style={{ fontWeight: 500 }}>{label}</span>
            </button>
            <a
              href={`/tents${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
              style={{ background: "var(--shop-blue)" }}
            >
              See what&apos;s available <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] Confirm: open `http://localhost:3000` in a browser. Clicking "Pick event dates" in the hero should open the nav calendar (the one in the top bar), not a second calendar below the hero.

- [ ] Commit:
```bash
git add src/app/(public)/Home-Hero.tsx
git commit -m "feat: hero calendar button now opens nav DateRangePicker via context"
```

---

### Task 8: getBulkTentConfigBuildableCount

**Files:**
- Modify: `src/services/inventoryService.ts`

- [ ] Add the following function at the end of `src/services/inventoryService.ts` (after `getTentConfigBuildableCount`):

```ts
// ---------------------------------------------------------------------------
// Bulk physical buildable count — no booking factor, used for public listing
// when no date range is selected. 1 query for all BOM data + at most 1 query
// for serialized unit counts. Significantly faster than N individual calls.
// ---------------------------------------------------------------------------

/**
 * Returns how many of each tent configuration can be built from owned physical
 * stock, ignoring all bookings. Used by the public tents page when no dates are
 * selected. Reuses calcBuildableFromParts (lib/availability.ts) — single source
 * of truth for BOM math.
 */
export async function getBulkTentConfigBuildableCount(
  configIds: number[],
): Promise<Map<number, { canBuild: number; bomComplete: boolean }>> {
  const out = new Map<number, { canBuild: number; bomComplete: boolean }>()
  if (configIds.length === 0) return out

  // Query 1: all configs + their full BOM in one round-trip
  const configs = await prisma.tentConfiguration.findMany({
    where: { id: { in: configIds } },
    select: {
      id: true,
      bomComplete: true,
      bomParts: {
        include: {
          tentPart: {
            select: { id: true, name: true, isSerialized: true, qty: true },
          },
        },
      },
    },
  })

  // Collect serialized part IDs that need a live unit count
  const serializedPartIds = [
    ...new Set(
      configs.flatMap(c =>
        c.bomParts
          .filter(r => r.tentPart.isSerialized && r.tentPart.qty === null)
          .map(r => r.tentPartId),
      ),
    ),
  ]

  // Query 2 (conditional): available SerializedUnit counts in one groupBy
  const serializedMap = new Map<number, number>()
  if (serializedPartIds.length > 0) {
    const counts = await prisma.serializedUnit.groupBy({
      by: ["tentPartId"],
      where: { tentPartId: { in: serializedPartIds }, status: "available" },
      _count: { id: true },
    })
    counts.forEach(r => { if (r.tentPartId) serializedMap.set(r.tentPartId, r._count.id) })
  }

  // Compute canBuild in memory — no more DB calls
  for (const config of configs) {
    if (!config.bomComplete || config.bomParts.length === 0) {
      out.set(config.id, { canBuild: 0, bomComplete: config.bomComplete })
      continue
    }

    const parts: BuildablePart[] = config.bomParts.map(row => ({
      tentPartId: row.tentPartId,
      name: row.tentPart.name,
      stock:
        row.tentPart.isSerialized && row.tentPart.qty === null
          ? (serializedMap.get(row.tentPartId) ?? 0)
          : (row.tentPart.qty ?? 0),
      qtyRequired: row.qtyRequired,
    }))

    const { canBuild } = calcBuildableFromParts(parts)
    out.set(config.id, { canBuild, bomComplete: true })
  }

  return out
}
```

- [ ] Commit:
```bash
git add src/services/inventoryService.ts
git commit -m "feat: add getBulkTentConfigBuildableCount (1-2 queries for all configs)"
```

---

### Task 9: Tents page — real stock without dates

**Files:**
- Modify: `src/app/(public)/tents/page.tsx`

- [ ] Add `getBulkTentConfigBuildableCount` to the import line at the top:

```ts
import { getItemAvailability, getTentConfigAvailability, getBulkTentConfigBuildableCount } from "@/services/inventoryService"
```

- [ ] Replace the `configsWithAvail` block (the `await Promise.all(configs.map(...))` starting around line 42). The new version fetches the bulk buildable map first when `!hasRange`, then uses it inside the map:

```ts
  // When no dates: fetch all buildable counts in 1-2 queries.
  // When dates are set: individual availability queries remain (they include booking data).
  const buildableMap = !hasRange
    ? await getBulkTentConfigBuildableCount(configs.map(c => c.id))
    : new Map<number, { canBuild: number; bomComplete: boolean }>()

  const configsWithAvail: Array<{ config: TentConfigurationSummary; avail: ConfigAvailabilityResult }> =
    await Promise.all(
      configs.map(async (c) => {
        const config = { ...c, flatPrice: Number(c.flatPrice) } as TentConfigurationSummary

        if (!hasRange) {
          const { canBuild, bomComplete } = buildableMap.get(c.id) ?? { canBuild: 0, bomComplete: c.bomComplete }
          return {
            config,
            avail: {
              available: canBuild,
              booked: 0,
              stock: canBuild,
              isLow: false,
              hasConflicts: false,
              bomComplete,
              bottleneckParts: [],
            } satisfies ConfigAvailabilityResult,
          }
        }

        return {
          config,
          avail: (await getTentConfigAvailability(c.id, from!, to!)) as ConfigAvailabilityResult,
        }
      }),
    )
```

- [ ] The `itemsWithAvail` block is unchanged — items already use `item.qty` as stock when `!hasRange`.

- [ ] Verify: open `http://localhost:3000/tents` without dates in the URL. Tent package cards should now show a real number (e.g. "2 in stock") instead of "0 in stock".

- [ ] Commit:
```bash
git add src/app/(public)/tents/page.tsx
git commit -m "feat: show real tent config stock on tents page when no dates selected"
```

---

### Task 10: CategoryListing — add-to-cart date gate

**Files:**
- Modify: `src/components/shared/CategoryListing.tsx`

- [ ] Replace the entire file. The only logic change is a `handleAdd` wrapper that calls `openPicker(message)` instead of `addToCart` when `!hasRange`:

```tsx
// src/components/shared/CategoryListing.tsx
"use client"
import { useState } from "react"
import { Grid, List } from "lucide-react"
import ItemCardGrid from "@/components/shared/ItemCard-Grid"
import ItemCardList from "@/components/shared/ItemCard-List"
import { useCart } from "@/contexts/CartContext"
import { useDatePicker } from "@/contexts/DatePickerContext"
import type { ItemSummary, AvailabilityResult } from "@/models/inventory"

export type ItemWithAvail = {
  item: ItemSummary
  avail: AvailabilityResult
}

type Props = {
  items: ItemWithAvail[]
  hasRange: boolean
  dateLabel?: string
}

export default function CategoryListing({ items, hasRange, dateLabel }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid")
  const [hideUnavailable, setHideUnavailable] = useState(false)
  const { lines, addToCart, updateLine } = useCart()
  const { openPicker } = useDatePicker()

  function handleAdd(refId: number, qty: number, name: string, unitPrice: number) {
    if (!hasRange) {
      openPicker("Select your event dates before adding items to your quote.")
      return
    }
    addToCart(refId, "item", qty, name, unitPrice)
  }

  const visible = hideUnavailable && hasRange
    ? items.filter(x => x.avail.available > 0)
    : items

  // Group by subcategory preserving first-appearance order
  const groups: { name: string; items: ItemWithAvail[] }[] = []
  const seen = new Map<string, number>()
  visible.forEach(x => {
    const key = x.item.subcategory ?? "Other"
    if (!seen.has(key)) { seen.set(key, groups.length); groups.push({ name: key, items: [] }) }
    groups[seen.get(key)!].items.push(x)
  })

  return (
    <>
      {/* Filter strip */}
      <div className="bg-white border-b border-(--shop-line) py-4 sticky top-32 md:top-25.75 z-30">
        <div className="max-w-[1320px] mx-auto px-4 md:px-8 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <span className="text-sm text-(--shop-ink-soft)">
              <strong className="text-(--shop-ink)">{visible.length}</strong> items
              {dateLabel ? <> · for {dateLabel}</> : null}
            </span>
            {hasRange ? (
              <label className="inline-flex gap-2 items-center text-sm text-(--shop-ink-soft) cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideUnavailable}
                  onChange={e => setHideUnavailable(e.target.checked)}
                />
                Hide fully-booked
              </label>
            ) : null}
          </div>
          <div className="flex gap-1.5 p-0.5 bg-(--shop-paper) rounded-lg">
            {(["grid", "list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold inline-flex gap-1.5 items-center transition-colors ${
                  view === v ? "bg-white text-(--shop-ink) shadow-sm" : "text-(--shop-ink-soft)"
                }`}>
                {v === "grid" ? <Grid size={13} /> : <List size={13} />}
                {v === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-10 pb-20">
        {groups.map((g, gi) => (
          <div key={g.name} className={gi < groups.length - 1 ? "mb-14" : ""}>
            {groups.length > 1 ? (
              <div className="flex justify-between items-baseline mb-6 pb-3 border-b border-(--shop-line)">
                <h2 className="serif text-3xl font-medium">{g.name}</h2>
                <span className="mono text-xs text-(--shop-ink-soft) uppercase tracking-widest">
                  {g.items.length} {g.items.length === 1 ? "item" : "items"}
                </span>
              </div>
            ) : null}
            {view === "grid" ? (
              <div className="grid gap-4 md:gap-7 grid-cols-2 md:grid-cols-3">
                {g.items.map(({ item, avail }) => (
                  <ItemCardGrid
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice) => handleAdd(refId, qty, name, unitPrice)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {g.items.map(({ item, avail }) => (
                  <ItemCardList
                    key={item.id}
                    item={item}
                    avail={avail}
                    hasRange={hasRange}
                    cartLine={lines.find(l => l.refId === item.id && l.kind === "item") ?? null}
                    onAdd={(refId, qty, name, unitPrice) => handleAdd(refId, qty, name, unitPrice)}
                    onUpdate={(refId, qty) => updateLine(refId, "item", qty)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 ? (
          <div className="text-center py-20 text-(--shop-ink-soft)">
            No items available for these dates. Try different dates or{" "}
            <button onClick={() => setHideUnavailable(false)} className="text-(--shop-blue) underline">
              show all items
            </button>.
          </div>
        ) : null}
      </div>
    </>
  )
}
```

- [ ] Verify: open `/tables-and-chairs` without dates. Click any "Add" button. The nav calendar should open with the amber message "Select your event dates before adding items to your quote." No item should be added to cart. Picking dates should close the picker and allow adding normally.

- [ ] Commit:
```bash
git add src/components/shared/CategoryListing.tsx
git commit -m "feat: gate add-to-cart on date selection, open nav calendar with prompt if missing"
```

---

## End-to-End Verification Checklist

Run through these manually after all tasks are complete:

- [ ] **Hero calendar** — clicking "Pick event dates" in the hero opens the nav DateRangePicker, not a second calendar. The hero button shows selected dates once picked.
- [ ] **No competing calendars** — only one DateRangePicker popup ever appears at a time.
- [ ] **Tents page without dates** — tent package cards show a real number (e.g. "2 in stock"), not "0 in stock".
- [ ] **Add without dates** — clicking Add on any item without dates opens the nav calendar with the amber message; no item is added.
- [ ] **Add with dates** — clicking Add with dates selected works normally, item appears in cart.
- [ ] **Date change, no conflicts** — changing dates with cart items that are all still available: dates apply immediately, no dialog.
- [ ] **Date change with conflicts** — changing dates where cart qty exceeds available for new dates: AlertDialog appears listing each conflict item with "X in quote · Y available". Clicking "Keep current dates" cancels, dates unchanged. Clicking "Remove N items & continue" removes those lines, applies new dates.
- [ ] **Enter key on conflict dialog** — pressing Enter when the dialog is open triggers the "Remove & continue" button (it has `autoFocus`).
