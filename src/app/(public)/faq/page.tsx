const FAQS = [
  { q: "Do you deliver and set up rentals?", a: "Yes, we provide full-service delivery and professional setup of all rental equipment. This allows you to focus on enjoying your event without worrying about logistics." },
  { q: "What tent sizes are available?", a: "We offer professional tent rentals ranging from 10'x10' to 40'x80'. All tents come with delivery and setup services included." },
  { q: "Can you provide tent heating and lighting?", a: "Yes, we offer tent heaters and lighting options for outdoor events. These are available as add-ons to our tent rental packages." },
  { q: "What types of tables do you rent?", a: "We rent cocktail tables, banquet tables, and conference tables. All table rentals are part of our complete table and chair service." },
  { q: "Do you offer custom neon signs?", a: "Yes, we provide custom neon signs as part of our comprehensive event decoration rentals. We also offer wooden arches and greenery walls." },
  { q: "What dance floor options are available?", a: "We offer wood grain dance floors and customizable dance floor options in various sizes. Perfect for creating party atmosphere at weddings and celebrations." },
  { q: "Do you provide event photography services?", a: "Yes, we offer professional event photography for parties, weddings, and corporate events. Gallery options are available for your photos." },
  { q: "Do you serve Meridian and Nampa?", a: "Yes, we provide rental services throughout the Boise area including Meridian, Nampa, Caldwell, Eagle, and Kuna." },
  { q: "What chair styles do you rent?", a: "We offer white resin chairs and plastic folding chairs for events of all sizes. Chair rentals are available with our complete table service." },
  { q: "Can you handle large corporate events?", a: "Yes, we provide rentals for events of all sizes including corporate events. We offer conference tables, professional photography, and full setup services." },
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
