import Image from "next/image"
import Link from "next/link"

type Props = {
  title: string
  subtitle: string
  imgSrc: string
  breadcrumb: string
}

/**
 * Full-bleed photo hero for category pages (tents, tables, decor).
 * Desktop only — hidden on mobile via `hidden md:block`.
 * On mobile the page renders a simple text-only header instead.
 */
export default function CategoryHero({ title, subtitle, imgSrc, breadcrumb }: Props) {
  return (
    <section
      className="hidden md:block relative overflow-hidden"
      style={{ height: "clamp(300px, 38vw, 500px)" }}
    >
      <Image
        src={imgSrc}
        alt={title}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Gradient overlay — bottom-heavy so text pops */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,18,38,0.18) 0%, rgba(10,18,38,0.62) 70%, rgba(10,18,38,0.82) 100%)",
        }}
      />
      {/* Text content pinned to bottom */}
      <div className="relative h-full flex flex-col justify-end max-w-330 mx-auto px-8 pb-10">
        <p className="text-xs text-white/70 mb-2">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          {" / "}
          <span className="text-white">{breadcrumb}</span>
        </p>
        <h1
          className="serif font-medium text-white leading-tight tracking-tight"
          style={{ fontSize: "clamp(40px, 5vw, 72px)", textShadow: "0 2px 16px rgba(0,0,0,0.35)" }}
        >
          {title}
        </h1>
        <p className="mt-2 text-base text-white/85 max-w-lg leading-relaxed">{subtitle}</p>
      </div>
    </section>
  )
}
