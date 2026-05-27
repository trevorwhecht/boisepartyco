# Single Calendar & Cart Conflict Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two UX bugs — (1) the hero no longer renders its own duplicate calendar, instead triggering the nav's calendar via a shared context; (2) changing dates with cart items triggers an availability check and shows a conflict dialog if any items exceed what's available for the new dates.

**Architecture:** A new `DatePickerContext` owns `isOpen`/`openPicker()`/`closePicker()` for the single nav calendar. The nav's `DateRangeField` gains optional controlled-mode props (`externalOpen`, `onExternalChange`) and defers to the context when they're provided. The hero's `DateRangeField` is replaced with a plain button that calls `openPicker()`. `ShopHeader.handleDateChange` becomes async: on a full range with cart items it fetches `/api/inventory/availability`, and if conflicts exist it holds the pending dates and shows a new `ShopHeaderConflictDialog` before applying.

**Tech Stack:** Next.js App Router, React 19, Tailwind 4, shadcn/ui, TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/contexts/DatePickerContext.tsx` | **Create** | Shared open/close state for the single nav calendar |
| `src/app/(public)/layout.tsx` | **Modify** | Mount `DatePickerProvider` |
| `src/components/shared/DateRangeField.tsx` | **Modify** | Add optional controlled mode (`externalOpen`, `onExternalChange`) |
| `src/components/shared/layout/ShopHeader-ConflictDialog.tsx` | **Create** | AlertDialog for cart-conflict confirmation |
| `src/components/shared/layout/ShopHeader.tsx` | **Modify** | Wire context; async conflict check on date change |
| `src/app/(public)/Home-Hero.tsx` | **Modify** | Replace `DateRangeField` instances with a context button |

> **No tests required.** All changes are React UI state management and event wiring. No pure business logic to unit-test.

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
  openPicker: () => void
  closePicker: () => void
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

export function DatePickerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openPicker = useCallback(() => setIsOpen(true), [])
  const closePicker = useCallback(() => setIsOpen(false), [])

  return (
    <DatePickerContext.Provider value={{ isOpen, openPicker, closePicker }}>
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

### Task 2: Public layout — mount DatePickerProvider

**Files:**
- Modify: `src/app/(public)/layout.tsx`

Current content:
```tsx
import { Suspense } from "react"
import ShopHeader from "@/components/shared/layout/ShopHeader"
import ShopFooter from "@/components/shared/layout/ShopFooter"
import { CartProvider } from "@/contexts/CartContext"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Suspense fallback={<div style={{ height: 137, background: "#fff", borderBottom: "1px solid #e4e7ec" }} />}>
        <ShopHeader />
      </Suspense>
      {children}
      <ShopFooter />
    </CartProvider>
  )
}
```

- [ ] Replace the entire file with:

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

### Task 3: DateRangeField — controlled mode

**Files:**
- Modify: `src/components/shared/DateRangeField.tsx`

- [ ] Replace the entire file with the following. The only changes from the original are: (1) two new optional props `externalOpen`/`onExternalChange`, (2) `isControlled`/`showPicker` derived values, (3) `close()` helper, (4) `toggle()` updated to call `onExternalChange`, (5) a `useEffect` to capture `anchorRect` when opened externally, (6) the `useEffect` click-outside handler updated to call `close()` instead of `setOpen(false)`, (7) the picker renders on `showPicker` and receives `onClose={close}`:

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
  // Controlled mode — when provided, the caller (DatePickerContext) owns open state
  externalOpen?: boolean
  onExternalChange?: (open: boolean) => void
}

export default function DateRangeField({
  start, end, onChange,
  compact, dark, fullWidth,
  externalOpen, onExternalChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const isControlled = externalOpen !== undefined
  const showPicker = isControlled ? externalOpen : open

  // When opened externally, capture anchor rect from the button
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
        />
      ) : null}
    </>
  )
}
```

- [ ] Commit:
```bash
git add src/components/shared/DateRangeField.tsx
git commit -m "feat: add controlled mode to DateRangeField (externalOpen/onExternalChange)"
```

---

### Task 4: ShopHeader-ConflictDialog

**Files:**
- Create: `src/components/shared/layout/ShopHeader-ConflictDialog.tsx`

- [ ] Check that shadcn's `alert-dialog` component exists:
```bash
ls src/components/ui/alert-dialog.tsx
```
Expected: file exists. If missing, run: `npx shadcn@latest add alert-dialog`

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
      <AlertDialogContent className="bg-(--color-background)">
        <AlertDialogHeader>
          <AlertDialogTitle>Some items aren&apos;t available for these dates</AlertDialogTitle>
          <AlertDialogDescription>
            The following items in your quote can&apos;t be fulfilled for the new dates and will be removed:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 6, margin: "0 0 4px" }}>
          {conflicts.map(line => (
            <li
              key={`${line.kind}-${line.refId}`}
              style={{ display: "flex", justifyContent: "space-between", gap: 16 }}
            >
              <span style={{ fontWeight: 500 }}>{line.name}</span>
              <span style={{ color: "var(--shop-ink-soft)", whiteSpace: "nowrap" }}>
                {line.qty} in quote · {line.available} available
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

### Task 5: ShopHeader — wire context + async conflict check

**Files:**
- Modify: `src/components/shared/layout/ShopHeader.tsx`

- [ ] Replace the entire file with the following. Changes from the original: (1) `useDatePicker` imported and destructured, (2) `lines` + `removeLine` added to `useCart()` destructure, (3) `pendingDates` + `conflicts` state added, (4) `applyDates` helper extracted, (5) `handleDateChange` is now `async` with conflict-check logic for full ranges with cart items, (6) `handleConflictProceed` + `handleConflictCancel` added, (7) both `DateRangeField` instances receive `externalOpen`/`onExternalChange`, (8) `ShopHeaderConflictDialog` rendered at the bottom of the header:

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
  const { isOpen: datePickerOpen, openPicker, closePicker } = useDatePicker()
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
    const params = new URLSearchParams(searchParams.toString())

    // Clear both dates
    if (!s) {
      params.delete("from")
      params.delete("to")
      localStorage.removeItem("bpr_dates")
      router.replace(`${pathname}?${params.toString()}`)
      return
    }

    // Partial selection (start only) — apply immediately, no conflict check needed
    if (!e) {
      params.set("from", fmtLocalDate(s))
      params.delete("to")
      localStorage.setItem("bpr_dates", JSON.stringify({ from: fmtLocalDate(s) }))
      router.replace(`${pathname}?${params.toString()}`)
      return
    }

    // Full range with empty cart — apply immediately
    if (lines.length === 0) {
      applyDates(s, e)
      return
    }

    // Full range with cart items — check availability before applying
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

      // Hold the dates and show the conflict dialog
      setPendingDates({ s, e })
      setConflicts(conflictLines)
    } catch {
      // Network error — apply dates anyway; server re-validates on order submit
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

      {/* ── Main nav area ── */}
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

            {/* Desktop nav links */}
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

            {/* Right group: desktop (date + quote) + account icon */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              {showDateAndQuote ? (
                <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
                  <DateRangeField
                    start={start}
                    end={end}
                    onChange={handleDateChange}
                    compact
                    externalOpen={datePickerOpen}
                    onExternalChange={(o) => o ? openPicker() : closePicker()}
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

          {/* Mobile action row: date picker + quote button */}
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
                  onExternalChange={(o) => o ? openPicker() : closePicker()}
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

- [ ] Commit:
```bash
git add src/components/shared/layout/ShopHeader.tsx
git commit -m "feat: wire DatePickerContext into ShopHeader, add async date-change conflict check"
```

---

### Task 6: Home-Hero — replace DateRangeField with context button

**Files:**
- Modify: `src/app/(public)/Home-Hero.tsx`

- [ ] Replace the entire file. Removes both `DateRangeField` instances and `handleChange`/`useRouter`. Adds `useDatePicker` and a `dateLabel` helper. The mobile and desktop buttons match the visual style of the removed `DateRangeField` buttons but call `openPicker()` instead of managing their own calendar:

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

- [ ] Commit:
```bash
git add src/app/(public)/Home-Hero.tsx
git commit -m "feat: hero date button now opens nav calendar via DatePickerContext"
```

---

### Task 7: Type check & smoke test

- [ ] Run the TypeScript compiler:
```bash
npx tsc --noEmit
```
Expected: no errors. Fix any that appear before continuing.

- [ ] Open `http://localhost:3000` in a browser and verify:
  - Clicking "Pick event dates" in the hero opens the nav's calendar (no second calendar appears below the hero)
  - Picking a date range in either the nav button or the hero-triggered calendar updates the URL and shows the selected dates in both the nav and hero buttons
  - Adding items to cart, then changing dates to a range where some items are unavailable shows the conflict dialog listing the affected items with their cart qty and available count
  - Clicking "Keep current dates" in the dialog closes it with no changes
  - Clicking "Remove items & continue" removes the listed items from the cart and applies the new dates
  - Changing dates when all cart items are still available applies silently with no dialog
