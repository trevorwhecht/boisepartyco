const GALLERY_ITEMS = [
  "Backyard wedding · Eagle",
  "Garden City brewery launch",
  "Sawtooth vineyard reception",
  "Boise Co-Op gala",
  "North End block party",
  "Capitol Park reception",
  "Lucky Peak engagement",
  "BSU homecoming tent",
  "Nampa family reunion",
]

export default function GalleryPage() {
  return (
    <main>
      <section className="py-16 pb-12 border-b border-(--shop-line)" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8">
          <h1 className="serif font-medium leading-tight" style={{ fontSize: 64 }}>Real Boise events</h1>
          <p className="mt-3 text-base text-(--shop-ink-soft) max-w-xl leading-relaxed">
            A peek inside the tents we've put up around the Treasure Valley over the years.
          </p>
        </div>
      </section>
      <section className="py-14 pb-20">
        <div className="max-w-330 mx-auto px-8">
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {GALLERY_ITEMS.map((label, i) => (
              <div key={i} className="bg-(--shop-paper) rounded-xl overflow-hidden border border-(--shop-line)"
                style={{ aspectRatio: i % 5 === 0 ? "4/5" : "4/3" }}>
                <div className="w-full h-full flex items-end p-4">
                  <span className="text-xs text-(--shop-ink-soft)">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
