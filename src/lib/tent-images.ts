// Slug → /images/tents/<filename>.webp
// Unlabeled sizes reuse the closest available photo.
export const TENT_IMAGES: Record<string, string> = {
  "10x10-pinnacle":  "/images/tents/10x10-pinnacle.webp",
  "15x15-tent":      "/images/tents/15x15.webp",
  "10x20-tent":      "/images/tents/20x20.webp",   // closest: 20x20 frame
  "20x20-tent":      "/images/tents/20x20.webp",
  "20x30-tent":      "/images/tents/20x30.webp",
  "20x40-tent":      "/images/tents/20x40.webp",
  "20x50-tent":      "/images/tents/20x40.webp",   // closest: 20x40
  "20x60-tent":      "/images/tents/30x60.webp",   // closest: 30x60 (same length)
  "20x70-tent":      "/images/tents/30x60.webp",
  "20x80-tent":      "/images/tents/40x80.webp",   // closest: 40x80 (same length)
  "20x90-tent":      "/images/tents/40x80.webp",
  "20x100-tent":     "/images/tents/40x80.webp",
  "30x30-tent":      "/images/tents/40x40.webp",   // closest: 40x40 (square)
  "30x45-tent":      "/images/tents/30x60.webp",   // closest: 30x60 (same width)
  "30x60-tent":      "/images/tents/30x60.webp",
  "30x75-tent":      "/images/tents/30x60.webp",
  "40x40-tent":      "/images/tents/40x40.webp",
  "40x60-tent":      "/images/tents/40x60.webp",
  "40x80-tent":      "/images/tents/40x80.webp",
}
