import { FAQAccordion } from "./FAQAccordion"

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
          <FAQAccordion />
        </div>
      </section>
    </main>
  )
}
