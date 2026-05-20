# Nav Cohesion & Mobile Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public ShopHeader fully mobile-responsive (hamburger, account panel, stacked action row) and update the dashboard Navbar to use BPR branding, with both navs sharing a Logo and Navbar-AccountPanel sub-component.

**Architecture:** Keep two separate layout components (ShopHeader for public, Navbar for app/dashboard). Extract a shared `Logo` component used by both. `Navbar-AccountPanel` (already built) gets reused in ShopHeader so sign-in/sign-up/staff-menu works identically on both surfaces.

**Tech Stack:** Next.js App Router · React 19 · Tailwind 4 · inline CSS variables (`--shop-*` tokens in `globals.css`) · next-auth v4 · shadcn/ui · Lucide icons

---

## Decisions Locked In

| Topic | Decision |
|---|---|
| Sign-in panel | Reuse existing `Navbar-AccountPanel` in ShopHeader |
| Mobile date picker | Full-width action row BELOW the hamburger/logo/account top row |
| Utility bar mobile | **Hidden completely** — social icons + tap-to-call phone move to bottom of hamburger drawer |
| Utility bar desktop | Keep as-is except remove "Staff dashboard" link (sign-in panel replaces it) |
| Mobile top row | `[☰ Hamburger]` · `[Logo centered absolute]` · `[👤 Account]` |
| Dashboard branding | Full SVG logo + "BOISE / PARTY RENTALS" wordmark (shared `<Logo />`) |
| Architecture | Two components, shared sub-components — no merge |

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| **Create** | `src/components/shared/layout/Logo.tsx` | Shared BPR SVG logo + wordmark; accepts `size="sm"\|"md"` |
| **Modify** | `src/components/shared/DateRangeField.tsx` | Add `fullWidth?: boolean` prop so mobile action row fills width |
| **Modify** | `src/components/shared/layout/ShopHeader.tsx` | Full mobile overhaul: hamburger, centered logo, account panel, stacked action row |
| **Modify** | `src/components/shared/layout/Navbar-Links.tsx` | Replace "QuotingApp" text with `<Logo size="sm" />` |
| **No change** | `src/components/shared/layout/Navbar-AccountPanel.tsx` | Already complete; reused as-is |
| **No change** | `src/components/shared/layout/Navbar.tsx` | Already complete |
| **No change** | `src/app/(public)/layout.tsx` | Already uses ShopHeader |
| **No change** | `src/app/(app)/layout.tsx` | Already uses Navbar |

---

## Task 1: Create shared Logo component

**Files:**
- Create: `src/components/shared/layout/Logo.tsx`

- [ ] **Step 1: Create Logo.tsx**

```tsx
// src/components/shared/layout/Logo.tsx
import Link from "next/link"

interface Props {
  size?: "sm" | "md"
  onClick?: () => void
}

export default function Logo({ size = "md", onClick }: Props) {
  const svgSize = size === "sm" ? 32 : 44
  const titleSize = size === "sm" ? 18 : 24
  const subtitleSize = size === "sm" ? 8 : 9.5

  return (
    <Link
      href="/"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 8 : 12,
        color: "var(--shop-blue)",
        textDecoration: "none",
      }}
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 44 44" fill="none" aria-hidden>
        <circle cx="22" cy="22" r="21" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 10 L34 30 H10 Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M22 10 V30 M16 30 L22 22 L28 30" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="22" cy="20" r="1.6" fill="currentColor" />
      </svg>
      <div style={{ lineHeight: 1.05 }}>
        <div
          className="serif"
          style={{ fontSize: titleSize, fontWeight: 600, letterSpacing: "0.02em" }}
        >
          BOISE
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: subtitleSize,
            letterSpacing: "0.32em",
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          PARTY&nbsp;&nbsp;RENTALS
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Verify file saved correctly**

Open `src/components/shared/layout/Logo.tsx` and confirm the SVG path matches the one in the current `ShopHeader` (the triangle tent icon).

- [ ] **Step 3: Commit**

```
git add src/components/shared/layout/Logo.tsx
git commit -m "feat: extract shared BPR Logo component"
```

---

## Task 2: Add `fullWidth` prop to DateRangeField

**Files:**
- Modify: `src/components/shared/DateRangeField.tsx`

The mobile action row needs the date picker button to fill remaining width. Currently the button is `inline-flex` with no width constraint.

- [ ] **Step 1: Read current file**

Open `src/components/shared/DateRangeField.tsx` — confirm the `Props` type and `style` object.

- [ ] **Step 2: Add `fullWidth` to Props**

In the `Props` type (around line 9), add:

```ts
type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  compact?: boolean
  dark?: boolean
  fullWidth?: boolean   // ← add this
}
```

- [ ] **Step 3: Destructure and apply `fullWidth`**

In the function signature (line 17), add `fullWidth` to destructuring:

```ts
export default function DateRangeField({ start, end, onChange, compact, dark, fullWidth }: Props) {
```

In the `compact` style block (lines ~33–45), change `display` and add `width`:

```ts
const style: React.CSSProperties = compact ? {
  display: "flex",                         // was "inline-flex" — flex works for both cases
  width: fullWidth ? "100%" : undefined,   // ← add
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background: dark ? "rgba(255,255,255,0.12)" : "#fff",
  border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : "#e4e7ec"}`,
  color: dark ? "#fff" : "#1a2433",
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
} : {
  // non-compact style unchanged
  display: "inline-flex", alignItems: "center", gap: 10,
  padding: "14px 22px", borderRadius: 8,
  background: "#fff", border: "1px solid #e4e7ec",
  color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
}
```

- [ ] **Step 4: Verify existing usages are unaffected**

Run a search — confirm no existing call site passes `fullWidth` (they'll all default to `undefined` → no change):

```bash
grep -rn "DateRangeField" src/ --include="*.tsx"
```

Expected: every existing call omits `fullWidth`. The `display: "flex"` change on compact mode has no visual difference since flex and inline-flex render identically when the parent isn't a flex container.

- [ ] **Step 5: Commit**

```
git add src/components/shared/DateRangeField.tsx
git commit -m "feat: add fullWidth prop to DateRangeField"
```

---

## Task 3: Refactor ShopHeader for mobile responsiveness + account panel

**Files:**
- Modify: `src/components/shared/layout/ShopHeader.tsx`

This is the largest task. The current file uses all inline styles and has zero responsive breakpoints. We rewrite it while keeping the same visual appearance on desktop.

**Target layout:**

```
MOBILE:
┌──────────────────────────────────────┐  (utility bar hidden on mobile)
│ [☰]    BOISE PARTY RENTALS      [👤] │  ← top row (72px)
│ [📅 Pick event dates ──────] [🛒]   │  ← action row
├──────────────────────────────────────┤
│ (nav drawer when open)               │
│   Home                               │
│   Tents                              │
│   Tables & Chairs                    │
│   Decor & Dance Floor                │
│   Gallery / FAQ / Contact            │
│  ────────────────────────────────── │
│  [FB] [IG]          📞 (208)306-3079 │  ← drawer footer
└──────────────────────────────────────┘

DESKTOP:
┌────────────────────────────────────────────────────────────────┐
│ [FB][IG] · Serving Boise, Meridian, Eagle & the Treasure Valley│
│                                          📞 (208) 306-3079     │
├────────────────────────────────────────────────────────────────┤
│ [▲ BOISE]   Home Tents Tables... Gallery FAQ Contact           │
│ [  PARTY ]                         [📅 Date] [🛒 Quote] [👤] │
└────────────────────────────────────────────────────────────────┘
```

- [ ] **Step 1: Replace ShopHeader.tsx with the new implementation**

```tsx
// src/components/shared/layout/ShopHeader.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Phone, Menu, X, UserRound } from "lucide-react"
import { useState } from "react"
import DateRangeField from "@/components/shared/DateRangeField"
import { useCart } from "@/contexts/CartContext"
import Logo from "@/components/shared/layout/Logo"
import NavbarAccountPanel from "@/components/shared/layout/Navbar-AccountPanel"
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

export default function ShopHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { cartCount } = useCart()
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const start = fromStr ? new Date(fromStr) : null
  const end = toStr ? new Date(toStr) : null

  function handleDateChange({ start: s, end: e }: DateRange) {
    const params = new URLSearchParams(searchParams.toString())
    if (s) params.set("from", s.toISOString().split("T")[0])
    else params.delete("from")
    if (e) params.set("to", e.toISOString().split("T")[0])
    else params.delete("to")
    router.replace(`${pathname}?${params.toString()}`)
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

          {/* Left: social icons + "Serving..." text */}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="https://facebook.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }} aria-label="Facebook">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }} aria-label="Instagram">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <span style={{ opacity: 0.6 }}>·</span>
            <span style={{ opacity: 0.85 }}>Serving Boise, Meridian, Eagle & the Treasure Valley</span>
          </div>

          {/* Right: phone icon + full number */}
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

          {/* Top row ────────────────────────────────────────────── */}
          <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>

            {/* Left group: hamburger (mobile) + logo (desktop) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Hamburger — mobile only */}
              <button
                className="md:hidden"
                style={{
                  minHeight: 44, minWidth: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
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

              {/* Logo — desktop: inline in left group */}
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
              {/* Date picker + Quote button — desktop only */}
              <div className="hidden md:flex" style={{ gap: 10, alignItems: "center" }}>
                <DateRangeField start={start} end={end} onChange={handleDateChange} compact />
                <QuoteButton cartCount={cartCount} onClick={closeAll} />
              </div>

              {/* Account icon — both mobile and desktop */}
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
          <div
            className="md:hidden"
            style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 12 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <DateRangeField start={start} end={end} onChange={handleDateChange} compact fullWidth />
            </div>
            <QuoteButton cartCount={cartCount} onClick={closeAll} />
          </div>
        </div>

        {/* Mobile nav drawer ─────────────────────────────────── */}
        <div
          className="md:hidden"
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

            {/* Drawer footer: social icons + tap-to-call (replaces utility bar on mobile) */}
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
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--shop-ink-soft)", display: "flex", minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "flex-start", touchAction: "manipulation" }}
                  aria-label="Facebook"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener"
                  style={{ color: "var(--shop-ink-soft)", display: "flex", minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "flex-start", touchAction: "manipulation" }}
                  aria-label="Instagram"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

      {/* Account panel — positions absolute from the header (sticky context) */}
      <NavbarAccountPanel isOpen={accountOpen} onClose={closeAll} navigate={navigate} />
    </header>
  )
}

// Extracted to avoid duplication between desktop and mobile rows
function QuoteButton({ cartCount, onClick }: { cartCount: number; onClick: () => void }) {
  return (
    <Link
      href="/quote"
      onClick={onClick}
      style={{
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

- [ ] **Step 2: Verify `NavbarAccountPanel` positions correctly**

The panel uses `className="absolute top-full right-0 left-0 sm:left-auto sm:w-80"`. Since it is a direct child of `<header style={{ position: "sticky" }}>`, `top: 100%` is relative to the header's total height (utility bar + top row + mobile action row). On mobile it will span full width; on sm+ it will be 320px pinned to the right edge. ✓

Check that the desktop nav wraps gracefully at ~1100px wide before going mobile. If nav links crowd the date picker at mid-widths, the `flex: 1; justify-content: center` on the nav will naturally compress. If items still overflow, consider adding `overflow: hidden` to the nav and reducing `gap` — note this as a visual QA step after running the dev server.

- [ ] **Step 3: Run dev server and visually QA**

```bash
npm run dev
```

Check on actual browser:
- **Desktop (≥ 768px):** logo left, 7 nav links centered, date picker + Quote + account icon right
- **Mobile (< 768px):** hamburger left, logo centered, account icon right; date picker + Quote button full-width row below; tap hamburger → nav slides down; tap account → sign-in panel drops
- **Utility bar mobile:** not rendered at all — dark blue bar is `hidden md:block`
- **Utility bar desktop:** full text + phone number, no "Staff dashboard" link
- **Hamburger drawer footer:** FB + IG SVG icons (left) + Phone icon + "(208) 306-3079" tap-to-call (right)

- [ ] **Step 4: Commit**

```
git add src/components/shared/layout/ShopHeader.tsx
git commit -m "feat: mobile-responsive ShopHeader with hamburger, stacked action row, and account panel"
```

---

## Task 4: Update Dashboard Navbar with BPR branding

**Files:**
- Modify: `src/components/shared/layout/Navbar-Links.tsx`

Replace both instances of the "QuotingApp" logo text with the shared `<Logo size="sm" />` component.

- [ ] **Step 1: Import Logo in Navbar-Links.tsx**

At the top of `src/components/shared/layout/Navbar-Links.tsx`, add the import:

```ts
import Logo from "@/components/shared/layout/Logo"
```

Remove the existing `Link` import only if it's no longer used elsewhere in the file — check: `Link` is still used in `DesktopLink` and `MobileLink`, so keep it.

- [ ] **Step 2: Replace desktop logo text**

Find (around line 62):
```tsx
{/* Logo — desktop: inline in left group */}
<Link href="/" onClick={closeAll} className="hidden md:block font-semibold text-(--color-foreground) text-lg tracking-tight shrink-0">
  QuotingApp
</Link>
```

Replace with:
```tsx
{/* Logo — desktop: inline in left group */}
<div className="hidden md:block">
  <Logo size="sm" onClick={closeAll} />
</div>
```

- [ ] **Step 3: Replace mobile logo text**

Find (around line 79):
```tsx
{/* Logo — mobile: perfectly centered via absolute positioning */}
<Link href="/" onClick={closeAll} className="md:hidden absolute left-1/2 -translate-x-1/2 font-semibold text-(--color-foreground) text-lg tracking-tight pointer-events-auto">
  QuotingApp
</Link>
```

Replace with:
```tsx
{/* Logo — mobile: perfectly centered via absolute positioning */}
<div className="md:hidden absolute left-1/2 -translate-x-1/2 pointer-events-auto">
  <Logo size="sm" onClick={closeAll} />
</div>
```

- [ ] **Step 4: Verify dashboard visually**

Navigate to `localhost:3000/dashboard`. Confirm:
- BPR logo (blue tent triangle + "BOISE / PARTY RENTALS") appears where "QuotingApp" was
- Mobile: logo is centered, hamburger left, account icon right
- Logo click navigates to `/`
- Hamburger still opens the nav links (Get Quote, Dashboard)
- Account panel still opens on the right

- [ ] **Step 5: Commit**

```
git add src/components/shared/layout/Navbar-Links.tsx
git commit -m "feat: replace QuotingApp branding with BPR logo in dashboard Navbar"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Sign-in dropdown added to ShopHeader (via `NavbarAccountPanel`) — Task 3
- [x] ShopHeader mobile-responsive — Task 3
- [x] Hamburger menu for public site — Task 3
- [x] Dashboard Navbar BPR branding — Task 4
- [x] Shared Logo component (single source of truth) — Task 1
- [x] Date picker mobile (full-width row below) — Task 3 + Task 2
- [x] Utility bar hidden on mobile (`hidden md:block`) — Task 3
- [x] Social icons + tap-to-call Phone icon moved to hamburger drawer footer — Task 3
- [x] "Staff dashboard" link removed from utility bar — Task 3
- [x] Account panel shared between both navs — Task 3 (reuses existing component)

**Placeholder scan:** No TBDs, no "add validation later", no "handle edge cases" — all steps show complete code.

**Type consistency:**
- `fullWidth?: boolean` added in Task 2, consumed in Task 3 ✓
- `Logo` props `size` and `onClick` consistent across Task 1, Task 3, Task 4 ✓
- `navigate(href: string)` and `onClose: () => void` match `NavbarAccountPanel`'s `Props` interface ✓

---

## Known Edge Cases to QA After Implementation

1. **Mid-breakpoint crowding (768px–900px desktop):** The 7 nav links + logo + date picker + quote + account may crowd at exactly the `md` breakpoint. If they wrap or overflow, reduce `gap` on the nav from `24` to `16`.

2. **Account panel z-index on mobile:** The panel uses `z-40`. The mobile nav drawer also uses `z-40`. Only one can be open at a time (state enforced), so no overlap issue. Verify by tapping account then hamburger rapidly.

3. **DateRangePicker popover positioning on mobile:** The picker uses `anchorRect` to position. In the mobile action row, the button is at the bottom of the header. The popover should still open downward — test on actual small screen.

4. **iOS safe-area:** The header is `position: sticky`. No `env(safe-area-inset-*)` is needed here since the header is at the top, not the bottom. The footer already handles bottom insets.
