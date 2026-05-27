// src/app/(public)/privacy-policy/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Boise Party Rentals",
  description: "Privacy policy for Boise Party Rentals — how we collect, use, and protect your information.",
}

const LAST_UPDATED = "May 26, 2025"
const PHONE = "(208) 306-3079"
const EMAIL = "info@boisepartyco.com"
const SITE_URL = "https://boisepartyco.com"

export default function PrivacyPolicyPage() {
  return (
    <main style={{ background: "var(--shop-paper)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 100px" }}>
        {/* Header */}
        <p style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--shop-ink-soft)", marginBottom: 16 }}>
          Legal
        </p>
        <h1 className="serif" style={{ fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 500, color: "var(--shop-ink)", marginBottom: 8, lineHeight: 1.15 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "var(--shop-ink-soft)", marginBottom: 48 }}>
          Last updated: {LAST_UPDATED}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40, fontSize: 15, lineHeight: 1.75, color: "var(--shop-ink)" }}>

          <section>
            <p>
              Boise Party Rentals, LLC ("Boise Party Rentals," "we," "us," or "our") operates {SITE_URL} and the associated
              order management platform. This Privacy Policy explains what information we collect, how we use it, and
              your rights regarding that information. By using our website or services, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>1. Information We Collect</h2>
            <p style={{ marginBottom: 12 }}>We collect information you provide directly to us, including:</p>
            <ul style={ulStyle}>
              <li><strong>Contact information</strong> — name, email address, phone number, and mailing address when you request a quote, place an order, or create an account.</li>
              <li><strong>Event details</strong> — event date, location, and rental items you request.</li>
              <li><strong>Payment information</strong> — collected and processed securely by our payment processor; we do not store full card numbers.</li>
              <li><strong>Communications</strong> — messages you send us via email, phone, or web forms.</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              We also collect limited technical data automatically (IP address, browser type, pages visited) via standard server logs and cookies to keep the site functional.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>2. How We Use Your Information</h2>
            <ul style={ulStyle}>
              <li>Process and fulfill rental orders and quotes</li>
              <li>Communicate with you about your reservation, delivery, and pickup</li>
              <li>Send SMS order notifications and updates (see Section 4)</li>
              <li>Respond to inquiries and provide customer support</li>
              <li>Improve our website and services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>3. How We Share Your Information</h2>
            <p style={{ marginBottom: 12 }}>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only:
            </p>
            <ul style={ulStyle}>
              <li>With service providers who help us operate our business (payment processors, delivery logistics, email/SMS platforms) under confidentiality agreements</li>
              <li>When required by law, subpoena, or court order</li>
              <li>To protect the rights, property, or safety of Boise Party Rentals or others</li>
            </ul>
          </section>

          <section>
            <h2 style={h2Style}>4. SMS / Text Messaging</h2>
            <p style={{ marginBottom: 12 }}>
              We use SMS (text message) to send order confirmations, booking updates, delivery reminders, and other
              service-related notifications.
            </p>

            <h3 style={h3Style}>Opt-In</h3>
            <p style={{ marginBottom: 12 }}>
              By providing your mobile phone number and checking the SMS consent box during checkout or in your
              account settings, you expressly consent to receive text messages from Boise Party Rentals at the number
              provided. Consent is not a condition of purchase.
            </p>

            <h3 style={h3Style}>Message Frequency</h3>
            <p style={{ marginBottom: 12 }}>
              Message frequency varies based on your order activity. You may receive messages when an order is created,
              confirmed, updated, out for delivery, or requires attention.
            </p>

            <h3 style={h3Style}>Message & Data Rates</h3>
            <p style={{ marginBottom: 12 }}>
              Message and data rates may apply. Check with your mobile carrier for details on your plan.
            </p>

            <h3 style={h3Style}>Opt-Out</h3>
            <p style={{ marginBottom: 12 }}>
              To stop receiving SMS messages, reply <strong>STOP</strong> to any message we send. You will receive
              one final confirmation text and no further messages. You can also contact us at {EMAIL} to opt out.
            </p>

            <h3 style={h3Style}>Help</h3>
            <p style={{ marginBottom: 12 }}>
              Reply <strong>HELP</strong> to any message for support, or contact us at {PHONE} or {EMAIL}.
            </p>

            <h3 style={h3Style}>No Mobile Information Sharing</h3>
            <p>
              Mobile phone numbers and SMS consent information collected by Boise Party Rentals will not be shared
              with, sold to, or used by third parties for their own marketing purposes. This information is used
              solely to deliver the service notifications described above.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>5. Cookies</h2>
            <p>
              Our website uses cookies and similar technologies to maintain your session, remember your cart, and
              analyze site traffic. You can disable cookies in your browser settings, but some site features
              may not function correctly without them.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>6. Data Retention</h2>
            <p>
              We retain your personal information for as long as needed to provide our services and fulfill our
              legal obligations. Order and transaction records are retained for a minimum of seven years for
              accounting and tax purposes. You may request deletion of your account and associated data at any
              time by contacting us.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>7. Children's Privacy</h2>
            <p>
              Our services are not directed to children under 13, and we do not knowingly collect personal
              information from children under 13. If you believe a child has provided us with personal information,
              contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be posted on this page
              with an updated date. Continued use of our services after changes constitutes your acceptance of the
              revised policy.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>9. Contact Us</h2>
            <p style={{ marginBottom: 8 }}>If you have questions about this Privacy Policy or your personal information:</p>
            <div style={{ background: "#fff", border: "1px solid var(--shop-line)", borderRadius: 10, padding: "20px 24px", fontSize: 14, lineHeight: 2 }}>
              <strong>Boise Party Rentals, LLC</strong><br />
              2815 W Overland Rd, Boise, ID 83705<br />
              <a href={`tel:${PHONE.replace(/\D/g,"")}`} style={{ color: "var(--shop-blue)" }}>{PHONE}</a><br />
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
