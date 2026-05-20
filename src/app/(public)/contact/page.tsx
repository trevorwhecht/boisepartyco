"use client"
import { MapPin, Phone, Mail } from "lucide-react"

export default function ContactPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Get in touch</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            We answer the phone. Same-day quotes for most inquiries.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-330 mx-auto px-8 grid gap-14" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <h3 className="serif text-2xl font-medium mb-4">Visit the showroom</h3>
            <div className="flex flex-col gap-4 text-sm text-(--shop-ink-soft) leading-relaxed">
              <div className="flex gap-3.5 items-start">
                <MapPin size={18} className="text-(--shop-blue) shrink-0 mt-0.5" />
                <span>2815 W Overland Rd<br />Boise, ID 83705</span>
              </div>
              <div className="flex gap-3.5 items-center">
                <Phone size={18} className="text-(--shop-blue) shrink-0" />
                <a href="tel:+12083063079" className="hover:text-(--shop-ink)">(208) 306-3079</a>
              </div>
              <div className="flex gap-3.5 items-center">
                <Mail size={18} className="text-(--shop-blue) shrink-0" />
                <a href="mailto:hello@boisepartyrentals.com" className="hover:text-(--shop-ink)">hello@boisepartyrentals.com</a>
              </div>
            </div>
            <div className="mt-7 aspect-[4/3] bg-(--shop-paper) rounded-xl border border-(--shop-line)" />
          </div>
          <div>
            <h3 className="serif text-2xl font-medium mb-1">Send us a note</h3>
            <p className="text-sm text-(--shop-ink-soft) mb-5 leading-relaxed">
              For specific items + dates, the quote form is faster. For everything else, here:
            </p>
            <form className="flex flex-col gap-4" onSubmit={e => e.preventDefault()}>
              {[
                { label: "Name", name: "name", type: "text" },
                { label: "Email", name: "email", type: "email" },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">{f.label}</label>
                  <input name={f.name} type={f.type}
                    className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue)" />
                </div>
              ))}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">Message</label>
                <textarea name="message" rows={4}
                  className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue) resize-y" />
              </div>
              <div>
                <button type="submit"
                  className="px-5 py-3 rounded-full text-sm font-semibold text-white"
                  style={{ background: "var(--shop-blue)" }}>
                  Send message
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
