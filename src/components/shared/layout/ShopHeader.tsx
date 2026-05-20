// src/components/shared/layout/ShopHeader.tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Phone } from "lucide-react"
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
            <a href="https://facebook.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: "#fff", opacity: 0.9 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
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
            {cartCount > 0 ? (
              <span style={{ background: "#fff", color: "#1f6fb2", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  )
}
