// src/app/(public)/terms/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms & Conditions | Boise Party Rentals",
  description: "Rental terms and conditions for Boise Party Rentals — deposits, cancellations, damage policy, and delivery.",
}

const LAST_UPDATED = "May 26, 2025"
const PHONE = "(208) 306-3079"
const EMAIL = "info@boisepartyco.com"

export default function TermsPage() {
  return (
    <main style={{ background: "var(--shop-paper)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 100px" }}>
        {/* Header */}
        <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--shop-ink-soft)", marginBottom: 16 }}>
          Legal
        </p>
        <h1 className="serif" style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 500, color: "var(--shop-ink)", marginBottom: 8, lineHeight: 1.15 }}>
          Terms & Conditions
        </h1>
        <p style={{ fontSize: 14, color: "var(--shop-ink-soft)", marginBottom: 48 }}>
          Last updated: {LAST_UPDATED}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40, fontSize: 15, lineHeight: 1.75, color: "var(--shop-ink)" }}>

          <section>
            <p>
              These Terms and Conditions ("Agreement") govern all rental transactions between Boise Party Rentals, LLC
              ("Boise Party Rentals," "we," "us," or "our") and you ("Client"). By submitting a quote request, placing
              an order, or accepting delivery of any rental items, you agree to be bound by this Agreement.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>1. Rental Period</h2>
            <p>
              All prices are quoted per-event unless otherwise stated. The rental period begins at the agreed delivery
              time and ends at the agreed pickup time. Items must be available for pickup at the scheduled time.
              Extended rental periods require prior written approval and may incur additional charges.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>2. Deposits & Payment</h2>
            <ul style={ulStyle}>
              <li>A deposit is required to hold your reservation date. The deposit amount will be specified in your quote.</li>
              <li>The remaining balance is due prior to or on the day of delivery unless other arrangements are confirmed in writing.</li>
              <li>We accept major credit cards, cash, check, and other payment methods listed at checkout.</li>
              <li>Deposits are non-refundable unless Boise Party Rentals cancels the order (see Section 4).</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>3. Pricing & Availability</h2>
            <p>
              All prices are subject to change. Your price is locked in once a deposit has been received and a
              written confirmation has been issued. Availability is not guaranteed until a deposit is received.
              We reserve the right to cancel undeposited reservations at any time.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>4. Cancellations & Changes</h2>
            <h3 style={h3Style}>Cancelled by Client</h3>
            <ul style={ulStyle}>
              <li><strong>More than 30 days before event:</strong> Deposit is forfeited; no further charges.</li>
              <li><strong>8–30 days before event:</strong> Deposit is forfeited; 25% of remaining balance due.</li>
              <li><strong>7 days or fewer before event:</strong> Full balance is due.</li>
            </ul>
            <h3 style={h3Style}>Cancelled by Boise Party Rentals</h3>
            <p>
              If we must cancel due to circumstances within our control, we will refund your deposit in full and make
              every effort to find a comparable vendor.
            </p>
            <h3 style={h3Style}>Changes</h3>
            <p style={{ marginTop: 12 }}>
              Order changes (adding or removing items, changing dates) are subject to availability and must be requested
              at least 72 hours before delivery. Reductions in order size may still incur charges at our discretion.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>5. Delivery, Setup & Pickup</h2>
            <ul style={ulStyle}>
              <li>Delivery fees are calculated based on distance and will be included in your quote.</li>
              <li>You are responsible for ensuring clear, safe access for our delivery team and vehicles.</li>
              <li>Setup and breakdown services are available for an additional fee. Basic delivery does not include setup unless specified.</li>
              <li>Someone 18 years or older must be present to accept delivery and sign for items.</li>
              <li>All items must be ready for pickup (collapsed, stacked, or in their original position) at the scheduled pickup time unless takedown service was purchased.</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>6. Client Responsibilities</h2>
            <ul style={ulStyle}>
              <li>You are responsible for all rental items from time of delivery until pickup.</li>
              <li>Do not move, modify, or allow others to tamper with structural equipment (tent poles, frames, stakes) unless specifically authorized.</li>
              <li>Rental items must be protected from extreme weather. You are responsible for securing items if wind, rain, or storms are forecast.</li>
              <li>Do not allow open flames, candles, or heating elements near linens or fabric items.</li>
              <li>Tables and chairs are designed for indoor or prepared-surface use. Do not drag chairs across concrete.</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>7. Damage, Loss & Theft</h2>
            <p style={{ marginBottom: 12 }}>
              You are financially responsible for any damage, loss, or theft of rental items during your rental period,
              including damage caused by guests, weather, or misuse. Charges will be assessed at replacement cost.
            </p>
            <ul style={ulStyle}>
              <li>Normal wear and expected soiling of linens is included. Stains requiring professional cleaning beyond standard laundering will be billed.</li>
              <li>Damaged or missing items will be invoiced within 5 business days of pickup.</li>
              <li>We reserve the right to charge your card on file for outstanding damage amounts.</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>8. Weather & Force Majeure</h2>
            <p>
              We do not issue refunds for weather-related cancellations unless we are physically unable to deliver.
              We strongly recommend tent rentals for outdoor events to mitigate weather risk. If severe weather
              (lightning, high winds exceeding 30 mph) threatens the safety of our equipment, we reserve the right
              to lower or remove structures without refund.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>9. Limitation of Liability</h2>
            <p>
              Boise Party Rentals is not liable for injuries or property damage caused by improper use of rental
              equipment, unauthorized modifications, or failure to follow our usage guidelines. Our maximum liability
              in any claim shall not exceed the total amount paid for the rental.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>10. Governing Law</h2>
            <p>
              This Agreement is governed by the laws of the State of Idaho. Any disputes shall be resolved in the
              courts of Ada County, Idaho.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>11. Contact</h2>
            <p style={{ marginBottom: 8 }}>Questions about these Terms? Reach us at:</p>
            <div style={{ background: "#fff", border: "1px solid var(--shop-line)", borderRadius: 10, padding: "20px 24px", fontSize: 14, lineHeight: 2 }}>
              <strong>Boise Party Rentals, LLC</strong><br />
              2815 W Overland Rd, Boise, ID 83705<br />
              <a href={`tel:${PHONE.replace(/\D/g, "")}`} style={{ color: "var(--shop-blue)" }}>{PHONE}</a><br />
              <a href={`mailto:${EMAIL}`} style={{ color: "var(--shop-blue)" }}>{EMAIL}</a>
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
  fontSize: 24,
  fontWeight: 600,
  color: "var(--shop-ink)",
  marginBottom: 14,
  marginTop: 0,
  borderBottom: "1px solid var(--shop-line)",
  paddingBottom: 10,
}

const h3Style: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--shop-ink-soft)",
  marginBottom: 6,
  marginTop: 20,
}

const ulStyle: React.CSSProperties = {
  paddingLeft: 20,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}
