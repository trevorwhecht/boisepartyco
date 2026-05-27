// src/lib/item-images.ts
// Central registry: item slug → public image path
// Add slugs here as new product photos come in.

export const ITEM_IMAGES: Record<string, string> = {
  // ── Tables ───────────────────────────────────────────
  "cocktail-30-table":      "/images/tables/cocktail-30.webp",
  "48-round-table":         "/images/tables/round-48.webp",
  "60-round-table":         "/images/tables/round-60.webp",
  "60-plastic-round-table": "/images/tables/round-60-plastic.webp",
  "4ft-banquet-table":      "/images/tables/banquet-4ft.webp",
  "6ft-banquet-table":      "/images/tables/banquet-6ft.webp",
  "8ft-banquet-table":      "/images/tables/banquet-8ft.webp",
  "8ft-plastic-banquet":    "/images/tables/banquet-8ft-plastic.webp",
  "6ft-conference-table":   "/images/tables/conference.webp",
  "8ft-conference-table":   "/images/tables/conference.webp",   // same shape, reuse
  "8ft-farm-table":         "/images/tables/banquet-6ft.webp",  // closest rustic rect

  // ── Chairs ───────────────────────────────────────────
  "white-resin-folding":    "/images/chairs/folding-white-padded.webp",
  "white-garden-folding":   "/images/chairs/folding-white.webp",

  // ── Tent accessories ─────────────────────────────────
  "tent-lights":  "/images/accessories/tent-lights.webp",
  "tent-heater":  "/images/accessories/tent-heater.webp",
}
