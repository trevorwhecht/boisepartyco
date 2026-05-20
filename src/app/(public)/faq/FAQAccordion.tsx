"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

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

export function FAQAccordion() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {FAQS.map((f, i) => {
        const isOpen = openItems.has(i)
        return (
          <div
            key={i}
            className="bg-white border border-(--shop-line) rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start justify-between gap-4 p-7 text-left cursor-pointer touch-manipulation"
              aria-expanded={isOpen}
            >
              <h3 className="serif text-xl font-medium leading-snug">{f.q}</h3>
              <ChevronDown
                size={20}
                className={`shrink-0 mt-1 text-(--shop-ink-soft) transition-transform duration-300 ease-out motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Smooth reveal using grid-template-rows animation — no JS height calc needed */}
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-7 pb-7 text-sm text-(--shop-ink-soft) leading-relaxed">
                  {f.a}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
