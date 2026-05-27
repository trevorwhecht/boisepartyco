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
import { useInventoryMode } from "@/contexts/InventoryModeContext"

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

  const inventoryMode = useInventoryMode()
  const showDateAndQuote = !pathname.startsWith("/dashboard") && inventoryMode !== "off"

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
