"use client"
import Image from "next/image"

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
]

// Duplicate so the seam is invisible — track animates exactly -50% then loops
const LOOP = [...IMAGES, ...IMAGES]

// Item width + gap must be uniform so translateX(-50%) lands perfectly on the seam.
// Using margin-right instead of flex gap avoids the off-by-half-gap issue.
const ITEM_W = "clamp(260px, 32vw, 460px)"
const ITEM_GAP = "16px"

export default function HomeGalleryCarousel() {
  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      {/* Keyframe defined inline — avoids globals.css coupling for a one-off animation */}
      <style>{`
        @keyframes gallery-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .gallery-track {
          animation: gallery-scroll 65s linear infinite;
          will-change: transform;
        }
      `}</style>

      <div className="max-w-330 mx-auto px-4 md:px-8 mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--shop-ink-soft) mb-3">Our work</p>
        <h2 className="serif font-medium tracking-tight leading-tight" style={{ fontSize: "clamp(28px, 5vw, 44px)" }}>
          Events across the Treasure Valley
        </h2>
      </div>

      {/* Auto-scrolling strip — bleeds past both edges */}
      <div className="gallery-track flex" style={{ width: "max-content" }}>
        {LOOP.map((img, i) => (
          <div
            key={i}
            className="shrink-0 rounded-xl overflow-hidden relative bg-(--shop-paper)"
            style={{
              width: ITEM_W,
              aspectRatio: "4/3",
              marginRight: ITEM_GAP,
            }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              sizes="(max-width: 768px) 80vw, 32vw"
              className="object-cover object-center"
              // Only eager-load the first few; rest lazy
              loading={i < 4 ? "eager" : "lazy"}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
