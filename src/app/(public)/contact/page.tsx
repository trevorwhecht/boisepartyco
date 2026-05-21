import ContactForm from "./components/Contact-Form"

export default function ContactPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line) bg-(--shop-paper)">
        <div className="max-w-330 mx-auto px-4 sm:px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Get in touch</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-lg leading-relaxed">
            We answer the phone. Same-day quotes for most inquiries.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-330 mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-14">
          {/* Left — contact form (top on mobile) */}
          <div>
            <h3 className="serif text-2xl font-medium mb-1">Send us a note</h3>
            <p className="text-sm text-(--shop-ink-soft) mb-5 leading-relaxed">
              For specific items + dates, the quote form is faster. For everything else, here:
            </p>
            <ContactForm />
          </div>

          {/* Right — map + contact info (bottom on mobile) */}
          <div>
            <div className="rounded-xl overflow-hidden border border-(--shop-line) aspect-4/3">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d216444.62939789408!2d-116.12139207959314!3d43.49336435906909!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x54aef9a4f54963a7%3A0x9fb359b6e7ec2531!2sBoise%20Party%20Co!5e0!3m2!1sen!2sus!4v1779378211943!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Boise Party Co location"
              />
            </div>
            {/* Name + hours side by side, aligned to top */}
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-(--shop-ink)">Boise Party Co</p>
                <p className="text-(--shop-ink-soft) mt-1 leading-relaxed">
                  2815 W Overland Rd<br />Boise, ID 83705
                </p>
                <a href="tel:+12083063079" className="mt-3 block text-(--shop-ink) hover:text-(--shop-blue) transition-colors">
                  (208) 306-3079
                </a>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-(--shop-ink-soft) mb-1.5">Hours</p>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <span className="text-(--shop-ink-soft) w-16 shrink-0">Mon – Fri</span>
                    <span className="text-(--shop-ink)">8:00 am – 5:00 pm</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-(--shop-ink-soft) w-16 shrink-0">Sat – Sun</span>
                    <span className="text-(--shop-ink)">Closed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
