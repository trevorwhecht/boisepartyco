const FAQS = [
  { q: "How far in advance should I book?", a: "For peak season (May–October), 6–9 months out is ideal. We do take last-minute bookings when stock allows — check live availability above." },
  { q: "Do you set up and take down?", a: "Yes. Setup and teardown are included in every quote. We deliver the day before and pick up the morning after." },
  { q: "What if the weather changes?", a: "Our tents are rated for sustained winds up to 40 mph. We monitor forecasts and will recommend sidewalls or extra ballast if needed." },
  { q: "What's your cancellation policy?", a: "Full refund up to 30 days out. 50% refund 14–30 days. Inside 14 days, deposit is non-refundable but we offer a date change credit." },
  { q: "Do you service outside Boise?", a: "Yes — Meridian, Eagle, Nampa, Caldwell, Kuna, Garden City, and most of the Treasure Valley. Delivery fee scales with distance." },
  { q: "Can I see a tent before booking?", a: "Absolutely. Schedule a 20-minute showroom visit and we'll walk you through every size and finish." },
]

export default function FAQPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Common questions</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            The things people ask the most. If yours isn't here, just call us.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-330 mx-auto px-8">
          <div className="grid grid-cols-2 gap-7">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white border border-(--shop-line) rounded-xl p-7">
                <h3 className="serif text-xl font-medium">{f.q}</h3>
                <p className="mt-2.5 text-sm text-(--shop-ink-soft) leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
