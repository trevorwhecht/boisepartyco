// Maps a category slug to the public-facing page URL prefix.
// Tent configurations always live under /tents regardless of this map.
const CAT_TO_PAGE: Record<string, string> = {
  decoration:        "decor",
  floor:             "decor",
  heater:            "decor",
  lighting:          "decor",
  linen:             "decor",
  tent:              "tents",
  chair:             "tables-and-chairs",
  table:             "tables-and-chairs",
}

export function itemUrl(categorySlug: string, itemSlug: string): string {
  const page = CAT_TO_PAGE[categorySlug] ?? "shop"
  return `/${page}/${itemSlug}`
}
