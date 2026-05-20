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
