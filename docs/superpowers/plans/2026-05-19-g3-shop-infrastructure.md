# G3: Shop Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app into `(public)/` and `(app)/` route groups, add shop design tokens + fonts, wire up CartContext (localStorage-backed), build the DateRangePicker, ShopHeader, ShopFooter, AvailabilityBadge, and QtyStepper, and create placeholder pages for every public shop route.

**Architecture:** Route groups let `(public)/layout.tsx` render ShopHeader + ShopFooter while `(app)/layout.tsx` renders the existing Navbar — both coexist under the same root layout. CartContext stores `CartLine[]` in localStorage. Date range lives in URL search params (not React context), so pages are server-rendered with live availability and links are shareable.

**Tech Stack:** Next.js App Router route groups · next/font/google · React Context + localStorage · Tailwind 4 · lucide-react

**Prerequisite:** G1 and G2 complete; dev server working with `npm run dev`.

---

## File Map

**Move (bash commands given in Task 1):**
- `src/app/account/` → `src/app/(app)/account/`
- `src/app/dashboard/` → `src/app/(app)/dashboard/`
- `src/app/get-quote/` → `src/app/(app)/get-quote/`
- `src/app/orders/` → `src/app/(app)/orders/`
- `src/app/quote-builder/` → `src/app/(app)/quote-builder/`

**Delete:** `src/app/page.tsx` (replaced by `(public)/page.tsx`)

**Modify:**
- `src/app/layout.tsx` — remove Navbar, add font variables
- `src/app/globals.css` — add shop tokens, `.serif`/`.mono` font classes

**Create:**
- `src/app/(app)/layout.tsx` — wraps existing admin pages with Navbar + `<main>`
- `src/app/(public)/layout.tsx` — wraps shop pages with CartProvider + ShopHeader + ShopFooter
- `src/app/(public)/page.tsx` — placeholder home (G4 replaces)
- `src/app/(public)/tents/page.tsx` — placeholder
- `src/app/(public)/tables-and-chairs/page.tsx` — placeholder
- `src/app/(public)/decor/page.tsx` — placeholder
- `src/app/(public)/shop/[slug]/page.tsx` — placeholder
- `src/app/(public)/quote/page.tsx` — placeholder
- `src/app/(public)/gallery/page.tsx` — placeholder
- `src/app/(public)/faq/page.tsx` — placeholder
- `src/app/(public)/contact/page.tsx` — placeholder
- `src/contexts/CartContext.tsx` — localStorage-backed cart
- `src/components/shared/DateRangePicker.tsx` — two-month calendar popup
- `src/components/shared/DateRangeField.tsx` — compact trigger button
- `src/components/shared/AvailabilityBadge.tsx` — green/amber/red availability pill
- `src/components/shared/QtyStepper.tsx` — –/input/+ stepper
- `src/components/shared/layout/ShopHeader.tsx` — sticky top nav for public pages
- `src/components/shared/layout/ShopFooter.tsx` — dark blue footer

---

### Task 1: Route group restructure

Move existing admin pages into `(app)/` so they get Navbar. Leave `(auth)/` and `api/` in place.

**Files:**
- Move: `account/`, `dashboard/`, `get-quote/`, `orders/`, `quote-builder/` → `(app)/`
- Create: `src/app/(app)/layout.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Confirm what needs to move**

```bash
ls src/app/
```

Expected output includes: `(auth)  account  api  dashboard  get-quote  globals.css  layout.tsx  orders  page.tsx  quote-builder`

- [ ] **Step 2: Create the `(app)/` directory and move pages**

```bash
mkdir -p "src/app/(app)"
mv src/app/account    "src/app/(app)/account"
mv src/app/dashboard  "src/app/(app)/dashboard"
mv src/app/get-quote  "src/app/(app)/get-quote"
mv src/app/orders     "src/app/(app)/orders"
mv src/app/quote-builder "src/app/(app)/quote-builder"
```

- [ ] **Step 3: Remove old root page.tsx** (it conflicts with `(public)/page.tsx`)

```bash
rm src/app/page.tsx
```

- [ ] **Step 4: Create `src/app/(app)/layout.tsx`**

```tsx
// src/app/(app)/layout.tsx
import Navbar from "@/components/shared/layout/Navbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
    </>
  )
}
```

- [ ] **Step 5: Update `src/app/layout.tsx`** — strip Navbar, add font variable placeholders

```tsx
import type { Metadata, Viewport } from "next"
import "./globals.css"
import SessionWrapper from "@/components/shared/layout/SessionWrapper"
import { Toaster } from "@/components/ui/sonner"
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Boise Party Rentals",
  description: "Party and event rentals in the Treasure Valley — tents, tables, décor, and more.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-(--color-background) text-(--color-foreground) antialiased">
        <SessionWrapper>
          {children}
          <Toaster />
        </SessionWrapper>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify dev server still starts**

```bash
npm run dev
```

Visit `http://localhost:3000/dashboard` — Navbar should still appear. Visit `http://localhost:3000` — should 404 (no public home yet). No TypeScript errors in the terminal.

---

### Task 2: Design tokens + font classes

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add shop design tokens and font classes**

Add the following to `src/app/globals.css` immediately after the closing `}` of the `:root` block (after line 72) and before the `@theme inline` block:

```css
/* Shop design tokens — used by all (public)/ pages */
:root {
  --shop-blue: #1f6fb2;
  --shop-blue-deep: #14507f;
  --shop-blue-soft: #e9f2fa;
  --shop-ink: #1a2433;
  --shop-ink-soft: #4a5666;
  --shop-line: #e4e7ec;
  --shop-paper: #f7f6f3;
  --shop-warn: #c0613a;
  --shop-ok: #2f7d52;
}

/* Typography classes used by shop pages — match design prototype class names */
.serif {
  font-family: var(--font-cormorant), "Cormorant Garamond", Georgia, serif;
}

.mono {
  font-family: var(--font-jetbrains), "JetBrains Mono", "Courier New", monospace;
}
```

- [ ] **Step 2: Verify fonts load**

```bash
npm run dev
```

In the browser, open DevTools → Network → filter "cormorant" or "jetbrains". Both font files should be fetched. Or run:
```bash
curl -s http://localhost:3000 | grep -i cormorant
```

(Only works once a page that uses the font is rendered — this is just a sanity check.)

---

### Task 3: CartContext

Cart persists across navigation via localStorage. Initializes after hydration to avoid SSR mismatch.

**Files:**
- Create: `src/contexts/CartContext.tsx`

- [ ] **Step 1: Create the context**

```tsx
// src/contexts/CartContext.tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import type { CartLine, CartLineKind } from "@/models/inventory"

type CartContextValue = {
  lines: CartLine[]
  cartCount: number
  addToCart: (line: CartLine) => void
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

  const addToCart = (line: CartLine) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.kind === line.kind && l.refId === line.refId)
      if (existing) {
        return prev.map((l) =>
          l.kind === line.kind && l.refId === line.refId
            ? { ...l, qty: l.qty + line.qty }
            : l,
        )
      }
      return [...prev, line]
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to CartContext.

---

### Task 4: DateRangePicker component

Two-month dual calendar, translated from the design prototype. Hover preview on hover. "This weekend" quick-pick.

**Files:**
- Create: `src/components/shared/DateRangePicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/DateRangePicker.tsx
"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { addDays, daysBetween, fmtRangeShort } from "@/lib/availability"

export type DateRange = { start: Date | null; end: Date | null }

type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  onClose?: () => void
  anchorRect?: DOMRect | null
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DOW = ["S","M","T","W","T","F","S"]

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDate = new Date(year, month, 1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: d, inMonth: d.getMonth() === month }
  })
}

type MonthViewProps = {
  year: number
  month: number
  start: Date | null
  end: Date | null
  hover: Date | null
  minDate: Date
  onPick: (d: Date) => void
  onHover: (d: Date | null) => void
  onPrev?: () => void
  onNext?: () => void
}

function MonthView({ year, month, start, end, hover, minDate, onPick, onHover, onPrev, onNext }: MonthViewProps) {
  const cells = monthGrid(year, month)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        {onPrev ? (
          <button onClick={onPrev} aria-label="prev" style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid #e4e7ec", background: "#fff", color: "#4a5666", cursor: "pointer" }}>
            <ChevronLeft size={14} />
          </button>
        ) : <span style={{ width: 28 }} />}
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: "#1a2433" }}>{MONTHS[month]} {year}</div>
        {onNext ? (
          <button onClick={onNext} aria-label="next" style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid #e4e7ec", background: "#fff", color: "#4a5666", cursor: "pointer" }}>
            <ChevronRight size={14} />
          </button>
        ) : <span style={{ width: 28 }} />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ fontSize: 11, textTransform: "uppercase", color: "#90969f", textAlign: "center", padding: "6px 0", letterSpacing: "0.06em", fontWeight: 500 }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const t = c.date.getTime()
          const disabled = c.date < minDate
          const isStart = !!(start && t === start.getTime())
          const isEnd = !!(end && t === end.getTime())
          const inRange = !!(start && end && c.date > start && c.date < end)
          const inHover = !!(start && !end && hover && c.date > start && c.date <= hover)
          const isEndpoint = isStart || isEnd
          return (
            <div key={i}
              style={{
                height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: disabled || !c.inMonth ? "default" : "pointer",
                fontSize: 13, position: "relative", userSelect: "none",
                color: isEndpoint ? "#fff" : !c.inMonth ? "#c4c8cf" : disabled ? "#d4d8df" : "#1a2433",
                background: isEndpoint ? "#1f6fb2" : inRange ? "#e9f2fa" : inHover ? "#f1f6fb" : "transparent",
                borderRadius: isEndpoint ? 6 : 0,
              }}
              onClick={() => !disabled && c.inMonth && onPick(c.date)}
              onMouseEnter={() => !disabled && c.inMonth && onHover(c.date)}
              onMouseLeave={() => onHover(null)}
            >
              {c.date.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ start, end, onChange, onClose, anchorRect }: Props) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const initial = start ?? today
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [hover, setHover] = useState<Date | null>(null)
  const [picking, setPicking] = useState<"start" | "end">(start && !end ? "end" : "start")

  const nav = (dir: number) => {
    setView((v) => {
      const m = v.month + dir
      if (m < 0) return { year: v.year - 1, month: 11 }
      if (m > 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: m }
    })
  }

  const pick = (d: Date) => {
    if (picking === "start" || (start && d < start)) {
      onChange({ start: d, end: null }); setPicking("end")
    } else {
      onChange({ start, end: d }); setPicking("start"); onClose?.()
    }
  }

  const right = { year: view.month === 11 ? view.year + 1 : view.year, month: (view.month + 1) % 12 }

  const top = anchorRect ? anchorRect.bottom + 8 : 80
  const left = anchorRect ? Math.max(16, anchorRect.left - 100) : 0

  const thisWeekend = (() => {
    const d = new Date(today); const dow = d.getDay(); d.setDate(d.getDate() + (dow <= 5 ? 5 - dow : 6)); return d
  })()

  return (
    <div data-cal-pop style={{ position: "absolute", top, left, background: "#fff", border: "1px solid #e4e7ec", borderRadius: 12, padding: 18, boxShadow: "0 24px 60px -16px rgba(20,30,50,0.18), 0 2px 8px rgba(0,0,0,0.04)", zIndex: 100, minWidth: 660 }}>
      <div style={{ display: "flex", gap: 28 }}>
        <MonthView year={view.year} month={view.month} start={start} end={end} hover={hover} minDate={today} onPick={pick} onHover={setHover} onPrev={() => nav(-1)} />
        <MonthView year={right.year} month={right.month} start={start} end={end} hover={hover} minDate={today} onPick={pick} onHover={setHover} onNext={() => nav(1)} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0f2f5" }}>
        <div style={{ fontSize: 13, color: "#4a5666" }}>
          {start && end ? <><strong style={{ color: "#1a2433" }}>{daysBetween(start, end)}</strong> {daysBetween(start, end) === 1 ? "day" : "days"} · {fmtRangeShort(start, end)}</> : start ? <>Pick an end date</> : <>Pick a start date</>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { onChange({ start: null, end: null }); setPicking("start") }} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #e4e7ec", borderRadius: 6, color: "#4a5666", fontSize: 13, cursor: "pointer" }}>Clear</button>
          <button onClick={() => { onChange({ start: thisWeekend, end: addDays(thisWeekend, 2) }); setPicking("start"); onClose?.() }} style={{ padding: "7px 14px", background: "#f5f7fa", border: "1px solid #e4e7ec", borderRadius: 6, color: "#1a2433", fontSize: 13, cursor: "pointer" }}>This weekend</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep DateRangePicker
```

Expected: no output (no errors).

---

### Task 5: DateRangeField component

Compact trigger button that opens DateRangePicker. The calling component handles URL sync — this is a controlled component.

**Files:**
- Create: `src/components/shared/DateRangeField.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/DateRangeField.tsx
"use client"

import { useRef, useState } from "react"
import { Calendar } from "lucide-react"
import DateRangePicker, { type DateRange } from "./DateRangePicker"
import { fmtRangeShort, daysBetween } from "@/lib/availability"

type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  compact?: boolean
  dark?: boolean
}

export default function DateRangeField({ start, end, onChange, compact, dark }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const toggle = () => {
    if (ref.current) setAnchorRect(ref.current.getBoundingClientRect())
    setOpen((o) => !o)
  }

  const label = start && end
    ? fmtRangeShort(start, end)
    : start
    ? `${fmtRangeShort(start, start).split(",")[0]} – pick end`
    : "Pick event dates"

  const style: React.CSSProperties = compact ? {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "8px 14px", borderRadius: 999,
    background: dark ? "rgba(255,255,255,0.12)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : "#e4e7ec"}`,
    color: dark ? "#fff" : "#1a2433",
    fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
  } : {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "14px 22px", borderRadius: 8,
    background: "#fff", border: "1px solid #e4e7ec",
    color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
  }

  return (
    <>
      <button data-cal-trigger ref={ref} onClick={toggle} style={style}>
        <Calendar size={compact ? 14 : 16} />
        <span style={{ fontWeight: 500 }}>{label}</span>
        {start && end && compact && (
          <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>
            {daysBetween(start, end)}d
          </span>
        )}
      </button>
      {open && (
        <DateRangePicker
          start={start}
          end={end}
          onChange={onChange}
          onClose={() => setOpen(false)}
          anchorRect={anchorRect}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep DateRangeField
```

Expected: no output.

---

### Task 6: ShopHeader

Sticky header with utility bar + main nav + DateRangeField (URL-synced) + cart button.

**Files:**
- Create: `src/components/shared/layout/ShopHeader.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/shared/layout/ShopHeader.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Phone, Instagram, Facebook } from "lucide-react"
import DateRangeField from "@/components/shared/DateRangeField"
import { useCart } from "@/contexts/CartContext"
import type { DateRange } from "@/components/shared/DateRangePicker"

const NAV = [
  { href: "/", label: "Home", match: ["/"] },
  { href: "/tents", label: "Tents", match: ["/tents"] },
  { href: "/tables-and-chairs", label: "Tables & Chairs", match: ["/tables-and-chairs"] },
  { href: "/decor", label: "Decor & Dance Floor", match: ["/decor"] },
  { href: "/gallery", label: "Gallery", match: ["/gallery"] },
  { href: "/faq", label: "FAQ", match: ["/faq"] },
  { href: "/contact", label: "Contact", match: ["/contact"] },
]

function Logo() {
  return (
    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "#1f6fb2", textDecoration: "none" }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
        <circle cx="22" cy="22" r="21" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M22 10 L34 30 H10 Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M22 10 V30 M16 30 L22 22 L28 30" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="22" cy="20" r="1.6" fill="currentColor"/>
      </svg>
      <div style={{ lineHeight: 1.05 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.02em" }}>BOISE</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.32em", fontWeight: 500, marginTop: 2 }}>PARTY  RENTALS</div>
      </div>
    </Link>
  )
}

export default function ShopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cartCount } = useCart()

  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const start = fromStr ? new Date(fromStr) : null
  const end = toStr ? new Date(toStr) : null

  const handleDateChange = ({ start: s, end: e }: DateRange) => {
    const params = new URLSearchParams(searchParams.toString())
    if (s) params.set("from", s.toISOString().split("T")[0])
    else params.delete("from")
    if (e) params.set("to", e.toISOString().split("T")[0])
    else params.delete("to")
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "#fff", borderBottom: "1px solid #e4e7ec" }}>
      {/* Utility bar */}
      <div style={{ background: "#14507f", color: "#fff", fontSize: 12.5, padding: "8px 0" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <a href="https://facebook.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }}><Facebook size={13} /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }}><Instagram size={13} /></a>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85 }}>Serving Boise, Meridian, Eagle & the Treasure Valley</span>
          </div>
          <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
            <Link href="/dashboard" style={{ color: "#fff", opacity: 0.85, fontSize: 12 }}>Staff dashboard</Link>
            <Link href="/contact" style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "#fff", fontWeight: 600 }}>
              <Phone size={13} /> (208) 306-3079
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
        <Logo />
        <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {NAV.map((n) => {
            const active = n.match.includes(pathname)
            return (
              <Link key={n.href} href={n.href} style={{
                fontSize: 14, fontWeight: 500,
                color: active ? "#1f6fb2" : "#1a2433",
                paddingBottom: 4,
                borderBottom: active ? "2px solid #1f6fb2" : "2px solid transparent",
                textDecoration: "none",
              }}>{n.label}</Link>
            )
          })}
        </nav>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <DateRangeField start={start} end={end} onChange={handleDateChange} compact />
          <Link href="/quote" style={{
            position: "relative", display: "inline-flex", gap: 8, alignItems: "center",
            padding: "10px 18px", borderRadius: 999,
            background: "#1f6fb2", color: "#fff", fontSize: 13.5, fontWeight: 600,
            textDecoration: "none",
          }}>
            <ShoppingCart size={14} />
            Quote
            {cartCount > 0 && (
              <span style={{ background: "#fff", color: "#1f6fb2", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep ShopHeader
```

Expected: no output.

---

### Task 7: ShopFooter + AvailabilityBadge + QtyStepper

Three focused components in one task.

**Files:**
- Create: `src/components/shared/layout/ShopFooter.tsx`
- Create: `src/components/shared/AvailabilityBadge.tsx`
- Create: `src/components/shared/QtyStepper.tsx`

- [ ] **Step 1: Create ShopFooter**

```tsx
// src/components/shared/layout/ShopFooter.tsx
import Link from "next/link"

function Logo() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "#fff" }}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden>
        <circle cx="22" cy="22" r="21" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M22 10 L34 30 H10 Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M22 10 V30 M16 30 L22 22 L28 30" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="22" cy="20" r="1.6" fill="currentColor"/>
      </svg>
      <div style={{ lineHeight: 1.05 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "0.02em" }}>BOISE</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, letterSpacing: "0.32em", fontWeight: 500, marginTop: 2 }}>PARTY  RENTALS</div>
      </div>
    </div>
  )
}

export default function ShopFooter() {
  return (
    <footer style={{ background: "#14507f", color: "#fff", padding: "60px 0 30px", marginTop: 80 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 60 }}>
        <div>
          <Logo />
          <p style={{ marginTop: 18, fontSize: 14, opacity: 0.78, lineHeight: 1.7 }}>
            Family-owned event rentals in the Treasure Valley. Tents, tables, dance floors, and the details in between — delivered, set up, and picked up by us.
          </p>
        </div>
        <div>
          <h4 style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7, marginBottom: 18 }}>Rentals</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            {[["Tents", "/tents"],["Tables & Chairs","/tables-and-chairs"],["Decor & Dance Floor","/decor"],["Gallery","/gallery"]].map(([label, href]) => (
              <li key={href}><Link href={href} style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7, marginBottom: 18 }}>Help</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            {[["FAQ","/faq"],["Contact","/contact"],["Request a quote","/quote"]].map(([label, href]) => (
              <li key={href}><Link href={href} style={{ color: "#fff", opacity: 0.85, textDecoration: "none" }}>{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.7, marginBottom: 18 }}>Visit</h4>
          <div style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.8 }}>
            2815 W Overland Rd<br/>
            Boise, ID 83705<br/>
            <a href="tel:2083063079" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6 }}>(208) 306-3079</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1320, margin: "40px auto 0", padding: "20px 32px 0", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-between", fontSize: 12.5, opacity: 0.65 }}>
        <span>© {new Date().getFullYear()} Boise Party Rentals. All rights reserved.</span>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Create AvailabilityBadge**

```tsx
// src/components/shared/AvailabilityBadge.tsx
type Props = {
  stock: number
  available: number
  hasRange: boolean
}

export default function AvailabilityBadge({ stock, available, hasRange }: Props) {
  if (!hasRange) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4a5666" }}>
        {stock} in stock
      </span>
    )
  }
  let bg: string, fg: string, label: string, dot: string
  if (available <= 0) {
    bg = "#fbeae6"; fg = "#c0613a"; label = "Fully booked"; dot = "#c0613a"
  } else if (available <= Math.ceil(stock * 0.2)) {
    bg = "#fdf3e2"; fg = "#a26b1d"; label = `Only ${available} left`; dot = "#d99a3a"
  } else {
    bg = "#e7f4ec"; fg = "#2f7d52"; label = `${available} available`; dot = "#2f7d52"
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Create QtyStepper**

```tsx
// src/components/shared/QtyStepper.tsx
"use client"

import { Minus, Plus } from "lucide-react"

type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  compact?: boolean
}

export default function QtyStepper({ value, onChange, min = 0, max = 999, compact }: Props) {
  const sz = compact ? 28 : 32
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #e4e7ec", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: sz, height: sz, background: "#fff", border: "none", color: "#4a5666", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        style={{ width: 44, height: sz, border: "none", textAlign: "center", fontSize: 13, fontWeight: 600, outline: "none" }}
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: sz, height: sz, background: "#fff", border: "none", color: "#4a5666", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -E "ShopFooter|AvailabilityBadge|QtyStepper"
```

Expected: no output.

---

### Task 8: Public layout + placeholder pages

Wire CartProvider + ShopHeader + ShopFooter into `(public)/layout.tsx`, then create a placeholder page for every public route.

**Files:**
- Create: `src/app/(public)/layout.tsx`
- Create: 9 placeholder page files

- [ ] **Step 1: Create `src/app/(public)/layout.tsx`**

```tsx
// src/app/(public)/layout.tsx
import { Suspense } from "react"
import ShopHeader from "@/components/shared/layout/ShopHeader"
import ShopFooter from "@/components/shared/layout/ShopFooter"
import { CartProvider } from "@/contexts/CartContext"

// ShopHeader uses useSearchParams — must be in Suspense to avoid static-render errors
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

- [ ] **Step 2: Create all placeholder pages** (G4 will replace each with real content)

`src/app/(public)/page.tsx`:
```tsx
export default function HomePage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Home — G4 coming soon</h1></main>
}
```

`src/app/(public)/tents/page.tsx`:
```tsx
export default function TentsPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Tents — G4 coming soon</h1></main>
}
```

`src/app/(public)/tables-and-chairs/page.tsx`:
```tsx
export default function TablesPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Tables & Chairs — G4 coming soon</h1></main>
}
```

`src/app/(public)/decor/page.tsx`:
```tsx
export default function DecorPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Decor & Dance Floor — G4 coming soon</h1></main>
}
```

`src/app/(public)/shop/[slug]/page.tsx`:
```tsx
export default function ShopItemPage({ params }: { params: { slug: string } }) {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Item: {params.slug} — G4 coming soon</h1></main>
}
```

`src/app/(public)/quote/page.tsx`:
```tsx
export default function QuotePage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Your Quote — G4 coming soon</h1></main>
}
```

`src/app/(public)/gallery/page.tsx`:
```tsx
export default function GalleryPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Gallery — G4 coming soon</h1></main>
}
```

`src/app/(public)/faq/page.tsx`:
```tsx
export default function FAQPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">FAQ — G4 coming soon</h1></main>
}
```

`src/app/(public)/contact/page.tsx`:
```tsx
export default function ContactPage() {
  return <main className="p-16 text-center"><h1 className="serif text-4xl">Contact — G4 coming soon</h1></main>
}
```

- [ ] **Step 3: Verify all public routes load with ShopHeader + ShopFooter**

```bash
npm run dev
```

Open each of these in a browser and confirm ShopHeader (dark blue utility bar + logo + nav) and ShopFooter (dark blue, 4-column) render correctly:
- `http://localhost:3000/` — serif "Home — G4 coming soon"
- `http://localhost:3000/tents`
- `http://localhost:3000/quote`
- `http://localhost:3000/gallery`

- [ ] **Step 4: Verify app routes still work**

Visit these and confirm old Navbar (not ShopHeader) still renders:
- `http://localhost:3000/dashboard`
- `http://localhost:3000/get-quote`

- [ ] **Step 5: Test DateRangeField URL sync**

1. Open `http://localhost:3000/tents`
2. Click the "Pick event dates" button in the header
3. Select a start and end date
4. URL should update to `http://localhost:3000/tents?from=YYYY-MM-DD&to=YYYY-MM-DD`
5. Reload the page — the date picker button should show the selected range

---

### Task 9: Build check

- [ ] **Step 1: Run full build**

```bash
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully` with no type errors. All public routes show as static or dynamic pages in the build output.

- [ ] **Step 2: Verify (app)/ routes in build output**

The build output should include routes like:
```
○ /dashboard
○ /get-quote
○ /quote-builder
```

And public routes:
```
○ /
○ /tents
○ /tables-and-chairs
...
```

If any route is missing or shows an error, check that the file was moved to the right location and all imports are correct.
