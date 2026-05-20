// src/components/shared/layout/ShopFooter.tsx
import Link from "next/link"
import Logo from "@/components/shared/layout/Logo"

export default function ShopFooter() {
  return (
    <footer style={{ background: "#14507f", color: "#fff", padding: "60px 0 30px", marginTop: 80 }}>
      <div className="max-w-330 mx-auto px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-15">
        <div>
          <Logo variant="white" size="md" />
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
      <div className="max-w-330 mx-auto mt-10 px-4 md:px-8 flex justify-between" style={{ paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 12.5, opacity: 0.65 }}>
        <span>© {new Date().getFullYear()} Boise Party Rentals. All rights reserved.</span>
      </div>
    </footer>
  )
}
