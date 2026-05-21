import { maxConcurrentBooked, buildAvailability, buildConfigAvailability, calcBuildableFromParts } from "./availability"

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

describe("calcBuildableFromParts", () => {
  it("returns 0 and null bottleneck for empty parts array", () => {
    expect(calcBuildableFromParts([])).toEqual({ canBuild: 0, bottleneck: null })
  })

  it("returns correct canBuild for a single part", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck).toBeNull() // single part — nothing else to be limited by
  })

  it("returns min across all parts and identifies the bottleneck", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },   // 5 max
      { tentPartId: 2, name: "Crown", stock: 12, qtyRequired: 1 },   // 12 max
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck?.name).toBe("Panel")
    expect(result.bottleneck?.maxFromThisPart).toBe(5)
  })

  it("returns null bottleneck when all parts are equally constraining", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 40, qtyRequired: 8 },   // 5 max
      { tentPartId: 2, name: "Pole",  stock: 20, qtyRequired: 4 },   // 5 max
    ])
    expect(result.canBuild).toBe(5)
    expect(result.bottleneck).toBeNull()
  })

  it("returns canBuild 0 when any part has zero stock", () => {
    const result = calcBuildableFromParts([
      { tentPartId: 1, name: "Panel", stock: 0,  qtyRequired: 4 },
      { tentPartId: 2, name: "Crown", stock: 12, qtyRequired: 1 },
    ])
    expect(result.canBuild).toBe(0)
    expect(result.bottleneck?.name).toBe("Panel")
  })
})
