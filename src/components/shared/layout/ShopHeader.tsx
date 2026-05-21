// src/components/shared/layout/ShopHeader.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Phone, Menu, X, UserRound } from "lucide-react"
import { useState, useEffect } from "react"
import DateRangeField from "@/components/shared/DateRangeField"
import { useCart } from "@/contexts/CartContext"
import Logo from "@/components/shared/layout/Logo"
import NavbarAccountPanel from "@/components/shared/layout/Navbar-AccountPanel"
import type { DateRange } from "@/components/shared/DateRangePicker"

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
  const { cartCount } = useCart()
  const [navOpen, setNavOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")
  const start = fromStr ? new Date(fromStr) : null
  const end = toStr ? new Date(toStr) : null

  // Restore dates from localStorage when URL loses them (e.g. navigating to a page with no ?from=&to=)
  useEffect(() => {
    const fromInUrl = searchParams.get("from")
    const toInUrl = searchParams.get("to")
    if (fromInUrl || toInUrl) return // URL already has dates, nothing to restore

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

  function handleDateChange({ start: s, end: e }: DateRange) {
    const params = new URLSearchParams(searchParams.toString())
    if (s) {
      const from = s.toISOString().split("T")[0]
      params.set("from", from)
      if (e) {
        const to = e.toISOString().split("T")[0]
        params.set("to", to)
        localStorage.setItem("bpr_dates", JSON.stringify({ from, to }))
      } else {
        params.delete("to")
        localStorage.setItem("bpr_dates", JSON.stringify({ from }))
      }
    } else {
      params.delete("from")
      params.delete("to")
      localStorage.removeItem("bpr_dates")
    }
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
            className="md:hidden flex items-center"
            style={{ gap: 10, paddingBottom: 12 }}
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
