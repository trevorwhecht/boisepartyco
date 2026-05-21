import { parseInventoryCsv } from "./csvInventory"

describe("parseInventoryCsv — items", () => {
  it("returns headerError for wrong header", () => {
    const result = parseInventoryCsv("wrong,cols\n1,foo,SKU,5", "items")
    expect(result.headerError).toBeTruthy()
  })

  it("returns headerError for empty input", () => {
    const result = parseInventoryCsv("", "items")
    expect(result.headerError).toBeTruthy()
  })

  it("parses valid rows", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,10\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 1, qty: 10 }, { id: 2, qty: 5 }])
    expect(result.skipped).toBe(0)
    expect(result.errors).toHaveLength(0)
  })

  it("skips rows with blank qty and counts them", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 2, qty: 5 }])
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(0)
  })

  it("skips whitespace-only qty and counts as skipped", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,   "
    const result = parseInventoryCsv(csv, "items")
    expect(result.skipped).toBe(1)
    expect(result.rows).toHaveLength(0)
  })

  it("collects row errors for invalid qty but still processes other rows", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,abc\n2,Table,TBL-01,5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toEqual([{ id: 2, qty: 5 }])
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Row 2")
  })

  it("errors on negative qty", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,-3"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Row 2")
  })

  it("errors on decimal qty (5.5 should not silently truncate to 5)", () => {
    const csv = "id,name,sku,qty\n1,Chair,CHR-01,5.5"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Row 2")
  })

  it("handles names with commas using id=first col, qty=last col", () => {
    // "Chair, Folding" causes extra columns after split — qty must use last col
    const csv = "id,name,sku,qty\n1,\"Chair, Folding\",CHR-01,25"
    const result = parseInventoryCsv(csv, "items")
    expect(result.rows).toEqual([{ id: 1, qty: 25 }])
  })
})

describe("parseInventoryCsv — tent-parts", () => {
  it("accepts tent-parts header", () => {
    const csv = "id,name,part_type,qty\n1,Panel,panel,40"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.headerError).toBeNull()
    expect(result.rows).toEqual([{ id: 1, qty: 40 }])
  })

  it("rejects items header when kind is tent-parts", () => {
    const csv = "id,name,sku,qty\n1,Panel,panel,40"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.headerError).toBeTruthy()
  })

  it("skips blank qty rows", () => {
    const csv = "id,name,part_type,qty\n1,Panel,panel,\n2,Crown,crown,12"
    const result = parseInventoryCsv(csv, "tent-parts")
    expect(result.rows).toEqual([{ id: 2, qty: 12 }])
    expect(result.skipped).toBe(1)
  })
})
