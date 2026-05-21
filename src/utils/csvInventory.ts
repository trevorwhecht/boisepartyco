// =============================================================================
// Pure CSV parsing utility for inventory bulk import.
// Uses id (first column) and qty (last column) — immune to commas in names.
// =============================================================================

export type CsvKind = "items" | "tent-parts"

export type ParsedCsvResult = {
  rows: { id: number; qty: number }[]
  skipped: number
  errors: string[]
  headerError: string | null
}

const EXPECTED_HEADERS: Record<CsvKind, string> = {
  "items": "id,name,sku,qty",
  "tent-parts": "id,name,part_type,qty",
}

/**
 * Parses a CSV string from an inventory template download.
 *
 * Rules:
 *  - Header row must match the expected format for `kind` exactly.
 *  - id = first column, qty = last column (handles names with commas).
 *  - Blank or whitespace-only qty → skip row (count as skipped, no error).
 *  - Invalid or negative qty → row error, row is excluded from results.
 *  - All valid rows are returned even if other rows have errors.
 */
export function parseInventoryCsv(csvText: string, kind: CsvKind): ParsedCsvResult {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)

  if (lines.length === 0) {
    return { rows: [], skipped: 0, errors: [], headerError: "CSV is empty" }
  }

  const header = lines[0].toLowerCase()
  if (header !== EXPECTED_HEADERS[kind]) {
    return {
      rows: [],
      skipped: 0,
      errors: [],
      headerError: `Unexpected CSV format. Expected header: ${EXPECTED_HEADERS[kind]}`,
    }
  }

  const rows: { id: number; qty: number }[] = []
  let skipped = 0
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    // Naive split is intentional: we control the template, so qty is never a quoted field.
    // id = first col, qty = last col — immune to commas in item names.
    const cols = lines[i].split(",")
    if (cols.length < 2) continue

    const id = parseInt(cols[0].trim(), 10)
    const qtyRaw = cols[cols.length - 1].trim() // always last column

    // Blank qty = intentionally skipped
    if (qtyRaw === "") {
      skipped++
      continue
    }

    if (isNaN(id)) {
      errors.push(`Row ${rowNum}: invalid id "${cols[0].trim()}"`)
      continue
    }

    if (!/^\d+$/.test(qtyRaw)) {
      errors.push(`Row ${rowNum}: invalid qty "${qtyRaw}" — must be a non-negative whole number`)
      continue
    }
    const qty = parseInt(qtyRaw, 10)

    rows.push({ id, qty })
  }

  return { rows, skipped, errors, headerError: null }
}
