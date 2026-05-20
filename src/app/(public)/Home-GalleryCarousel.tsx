"use client"
import Image from "next/image"
import { useRef, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

const IMAGES = [
  { src: "/images/gallery/g01.jpg",  alt: "Boise Party Co. event" },
  { src: "/images/gallery/g02.jpg",  alt: "Boise Party Co. event" },
  { src: "/images/gallery/g03.jpg",  alt: "Boise Party Co. event" },
  { src: "/images/gallery/g04.jpg",  alt: "Boise Party Co. event" },
  { src: "/images/gallery/g05.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g06.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g07.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g08.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g09.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g10.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g11.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g12.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g13.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g14.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g15.webp", alt: "Boise Party Co. event" },
  { src: "/images/gallery/g16.webp", alt: "Boise Party Co. event" },
]

export default function HomeGalleryCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(true)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }, [])

  const scroll = (dir: "prev" | "next") => {
    const el = trackRef.current
    if (!el) return
    const step = el.clientWidth * 0.75
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" })
  }

  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="max-w-330 mx-auto px-4 md:px-8 mb-8 flex justify-between items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-3">Our work</p>
          <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: "clamp(28px, 5vw, 44px)" }}>
            Events across the Treasure Valley
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll("prev")}
            disabled={!canPrev}
            aria-label="Previous photos"
            className="w-10 h-10 rounded-full border border-(--shop-line) flex items-center justify-center text-(--shop-ink) disabled:opacity-30 hover:bg-(--shop-paper) transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll("next")}
            disabled={!canNext}
            aria-label="Next photos"
            className="w-10 h-10 rounded-full border border-(--shop-line) flex items-center justify-center text-(--shop-ink) disabled:opacity-30 hover:bg-(--shop-paper) transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Scroll track — bleeds to screen edges */}
      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth pl-4 md:pl-[max(2rem,calc((100vw-1320px)/2+2rem))] pr-4"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {IMAGES.map((img, i) => (
          <div
            key={i}
            className="shrink-0 rounded-xl overflow-hidden relative bg-(--shop-paper)"
            style={{
              width: "clamp(260px, 36vw, 480px)",
              aspectRatio: "4/3",
              scrollSnapAlign: "start",
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 80vw, 36vw"
              className="object-cover object-center"
            />
          </div>
        ))}
        {/* Trailing spacer */}
        <div className="shrink-0 w-4 md:w-8" />
      </div>

      <div className="max-w-330 mx-auto px-4 md:px-8 mt-8">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--shop-blue)"
        >
          View full gallery →
        </Link>
      </div>
    </section>
  )
}
