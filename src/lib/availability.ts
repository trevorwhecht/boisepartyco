// =============================================================================
// Pure availability math.
// No Prisma, no IO — all functions are deterministic and trivially testable.
// inventoryService.ts wraps these with DB queries.
// =============================================================================

// ----- Date helpers ---------------------------------------------------------

// Parse a "YYYY-MM-DD" string as local midnight — new Date(str) parses as UTC,
// which rolls back a day in any timezone behind UTC (e.g. Mountain Time).
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Format a Date as "YYYY-MM-DD" using local time — toISOString() uses UTC,
// which rolls back a day when local midnight is still the previous day in UTC.
export function fmtLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() + n)
  return x
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000) + 1
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

// ----- Booking demand -------------------------------------------------------

export type BookingDemand = {
  qty: number
  start: Date
  end: Date
}

/**
 * Walks each day in [from, to] and finds the maximum total qty reserved
 * on any single day across overlapping bookings.
 *
 * Equivalent to:  max over d in [from,to] of  sum(b.qty for b where d in b)
 *
 * Returns the booked count that should be subtracted from stock.
 */
export function maxConcurrentBooked(
  bookings: BookingDemand[],
  from: Date,
  to: Date,
): number {
  if (bookings.length === 0) return 0
  let max = 0
  for (let d = startOfDay(from); d <= startOfDay(to); d = addDays(d, 1)) {
    let day = 0
    for (const b of bookings) {
      if (d >= startOfDay(b.start) && d <= startOfDay(b.end)) day += b.qty
    }
    if (day > max) max = day
  }
  return max
}

// ----- Availability ---------------------------------------------------------

export type AvailabilityShape = {
  stock: number
  booked: number
  available: number
  hasConflicts: boolean
  isLow: boolean
}

export function buildAvailability(stock: number, booked: number): AvailabilityShape {
  const available = Math.max(0, stock - booked)
  return {
    stock,
    booked,
    available,
    hasConflicts: booked > stock,
    isLow: stock > 0 && available > 0 && available <= Math.ceil(stock * 0.2),
  }
}

// ----- Bill-of-materials availability --------------------------------------

/**
 * For a tent configuration, given:
 *  - the BOM (parts × qtyRequired per single config built)
 *  - each part's net stock & booked qty over the date range
 *
 * Compute how many of this config can still be built.
 *
 * The bottleneck = the part with the lowest floor(partAvailable / qtyRequired).
 */
export type PartSnapshot = {
  tentPartId: number
  name: string
  stock: number
  booked: number
  qtyRequired: number   // for this config
}

export type ConfigAvailabilityShape = AvailabilityShape & {
  bottleneckParts: (PartSnapshot & { maxBuildable: number })[]
}

export function buildConfigAvailability(parts: PartSnapshot[]): ConfigAvailabilityShape {
  if (parts.length === 0) {
    // No BOM rows = BOM incomplete. Caller flags via bomComplete=false
    // and we treat this as effectively unbounded (no constraint) so the
    // booking is allowed but flagged.
    return { ...buildAvailability(0, 0), bottleneckParts: [] }
  }

  const annotated = parts.map((p) => {
    const partAvail = Math.max(0, p.stock - p.booked)
    const maxBuildable = p.qtyRequired > 0 ? Math.floor(partAvail / p.qtyRequired) : 0
    return { ...p, maxBuildable }
  })

  // "Stock" for the config = how many we could build if NO bookings existed
  const fullStock = Math.min(...parts.map((p) => p.qtyRequired > 0 ? Math.floor(p.stock / p.qtyRequired) : 0))
  // "Available" = min across parts after deductions
  const availableNow = Math.min(...annotated.map((p) => p.maxBuildable))
  const booked = Math.max(0, fullStock - availableNow)

  return {
    ...buildAvailability(fullStock, booked),
    bottleneckParts: annotated
      .filter((p) => p.maxBuildable === availableNow)
      .sort((a, b) => a.maxBuildable - b.maxBuildable),
  }
}

// ----- Formatting helpers (UI) ---------------------------------------------

export function fmtRangeShort(start: Date | null, end: Date | null): string {
  if (!start || !end) return ""
  const monthA = start.toLocaleString("en-US", { month: "short" })
  const monthB = end.toLocaleString("en-US", { month: "short" })
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${monthA} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
  }
  return `${monthA} ${start.getDate()} – ${monthB} ${end.getDate()}, ${end.getFullYear()}`
}

// ----- Buildable count (physical stock only, no booking factor) ---------------

export type BuildablePart = {
  tentPartId: number
  name: string
  stock: number       // physical units owned (TentPart.qty or SerializedUnit count)
  qtyRequired: number // how many this part a single config needs
}

export type BuildableResult = {
  canBuild: number
  bottleneck: {
    tentPartId: number
    name: string
    stock: number
    qtyRequired: number
    maxFromThisPart: number
  } | null
}

/**
 * Derives how many tent configurations can be built from physical part stock.
 * No bookings, no date ranges — purely "how many do we own vs how many do we need".
 *
 * bottleneck is null when parts list is empty, has one part, or all parts are
 * equally constraining (nothing stands out as the limiting factor).
 */
export function calcBuildableFromParts(parts: BuildablePart[]): BuildableResult {
  if (parts.length === 0) return { canBuild: 0, bottleneck: null }

  const withMax = parts.map(p => ({
    ...p,
    maxFromThisPart: Math.floor(p.stock / p.qtyRequired),
  }))

  const canBuild = Math.min(...withMax.map(p => p.maxFromThisPart))

  // Only surface a bottleneck when one part clearly limits relative to others
  const allSame = withMax.every(p => p.maxFromThisPart === canBuild)
  const limiting = withMax.find(p => p.maxFromThisPart === canBuild)!

  return {
    canBuild,
    bottleneck: allSame ? null : limiting,
  }
}
