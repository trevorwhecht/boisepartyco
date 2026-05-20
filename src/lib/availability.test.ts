import { maxConcurrentBooked, buildAvailability, buildConfigAvailability } from "./availability"

const d = (offset: number) => {
  const x = new Date("2026-06-01")
  x.setDate(x.getDate() + offset)
  x.setHours(0, 0, 0, 0)
  return x
}

describe("maxConcurrentBooked", () => {
  it("returns 0 with no bookings", () => {
    expect(maxConcurrentBooked([], d(0), d(2))).toBe(0)
  })

  it("counts overlapping bookings on their peak day", () => {
    const bookings = [
      { qty: 10, start: d(0), end: d(2) },
      { qty: 5,  start: d(1), end: d(3) },
    ]
    expect(maxConcurrentBooked(bookings, d(0), d(2))).toBe(15)
  })

  it("ignores bookings outside the query range", () => {
    const bookings = [{ qty: 99, start: d(10), end: d(12) }]
    expect(maxConcurrentBooked(bookings, d(0), d(2))).toBe(0)
  })
})

describe("buildAvailability", () => {
  it("clamps available to 0 when overbooked", () => {
    const result = buildAvailability(10, 15)
    expect(result.available).toBe(0)
    expect(result.hasConflicts).toBe(true)
  })

  it("flags isLow when available <= 20% of stock", () => {
    expect(buildAvailability(100, 82).isLow).toBe(true)
    expect(buildAvailability(100, 50).isLow).toBe(false)
  })
})

describe("buildConfigAvailability", () => {
  it("returns zero with empty BOM (incomplete)", () => {
    const result = buildConfigAvailability([])
    expect(result.available).toBe(0)
    expect(result.bottleneckParts).toHaveLength(0)
  })

  it("constrains config count by the tightest part", () => {
    const parts = [
      { tentPartId: 1, name: "Panel", stock: 4, booked: 0, qtyRequired: 2 },
      { tentPartId: 2, name: "Pole",  stock: 30, booked: 0, qtyRequired: 6 },
    ]
    const result = buildConfigAvailability(parts)
    expect(result.available).toBe(2)
    expect(result.bottleneckParts[0].tentPartId).toBe(1)
  })
})
