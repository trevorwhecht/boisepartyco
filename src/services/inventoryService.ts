// =============================================================================
// Inventory service — Prisma-backed availability queries.
// Wraps the pure functions in lib/availability.ts with the DB lookups.
//
// Inventory-consuming orders are determined by OrderState.consumesInventory.
// That flag is set by the admin/seed — typically true for state 3+ (deposit
// received, paid, fulfilled, etc.) and false for draft/quote-requested states.
// =============================================================================

import { prisma } from "@/lib/prisma"
import {
  buildAvailability,
  buildConfigAvailability,
  maxConcurrentBooked,
  calcBuildableFromParts,
  fmtLocalDate,
  type AvailabilityShape,
  type BookingDemand,
  type ConfigAvailabilityShape,
  type PartSnapshot,
  type BuildablePart,
  type BuildableResult,
} from "@/lib/availability"
import type { AdminTentConfigSummary } from "@/models/inventory"

// ---------------------------------------------------------------------------
// Item availability
// ---------------------------------------------------------------------------

/**
 * Availability for a single non-tent Item over [from, to].
 *
 *  - Non-serialized item (qty != null): stock = item.qty,
 *      booked = max concurrent SUM(line.qty) across overlapping orders.
 *
 *  - Serialized item (qty == null): stock = count(SerializedUnit available),
 *      booked = max concurrent SUM(line.qty) similarly.
 *      (We don't pin specific physical units to orders yet; that's a future
 *      enhancement when fulfillment picks specific units.)
 */
export async function getItemAvailability(
  itemId: number,
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<AvailabilityShape> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { category: { select: { isSerialized: true } } },
  })
  if (!item) return buildAvailability(0, 0)

  // Stock
  let stock = 0
  if (item.category.isSerialized) {
    stock = await prisma.serializedUnit.count({
      where: { itemId, status: "available" },
    })
  } else {
    stock = item.qty ?? 0
  }

  // Booked demand
  const lines = await prisma.orderLineItem.findMany({
    where: {
      itemId,
      ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
      order: {
        startDate: { lte: to },
        dueDateEnd: { gte: from },
        state: { consumesInventory: true },
      },
    },
    select: {
      qty: true,
      order: { select: { startDate: true, dueDateEnd: true } },
    },
  })

  const demand: BookingDemand[] = lines
    .filter((l) => l.order.startDate && l.order.dueDateEnd)
    .map((l) => ({
      qty: l.qty,
      start: l.order.startDate!,
      end: l.order.dueDateEnd!,
    }))

  const booked = maxConcurrentBooked(demand, from, to)
  return buildAvailability(stock, booked)
}

// ---------------------------------------------------------------------------
// Tent part availability (used internally by config availability)
// ---------------------------------------------------------------------------

/**
 * Net availability for a single TentPart over [from, to].
 *
 * Demand on a part = sum over all orders' line items where line.tentConfigId
 * has this part in its BOM:  line.qty * bomRow.qtyRequired
 *
 * Plus any direct line.itemId references (rare — most parts are referenced
 * only through configs, but if you ever rent panels solo as Items, it's
 * already covered by the lines pulled in here).
 */
export async function getTentPartAvailability(
  tentPartId: number,
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<AvailabilityShape> {
  const part = await prisma.tentPart.findUnique({
    where: { id: tentPartId },
  })
  if (!part) return buildAvailability(0, 0)

  // Stock — if qty is explicitly set, always use it (qty-based tracking).
  // Only count SerializedUnit records when isSerialized is true AND qty is null.
  let stock = 0
  if (part.isSerialized && part.qty === null) {
    stock = await prisma.serializedUnit.count({
      where: { tentPartId, status: "available" },
    })
  } else {
    stock = part.qty ?? 0
  }

  // Pull all order lines that reference a config containing this part
  const lines = await prisma.orderLineItem.findMany({
    where: {
      tentConfigId: { not: null },
      ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
      order: {
        startDate: { lte: to },
        dueDateEnd: { gte: from },
        state: { consumesInventory: true },
      },
      tentConfig: {
        bomParts: { some: { tentPartId } },
      },
    },
    select: {
      qty: true,
      order: { select: { startDate: true, dueDateEnd: true } },
      tentConfig: {
        select: {
          bomParts: {
            where: { tentPartId },
            select: { qtyRequired: true },
          },
        },
      },
    },
  })

  const demand: BookingDemand[] = lines
    .filter((l) => l.order.startDate && l.order.dueDateEnd && l.tentConfig?.bomParts[0])
    .map((l) => ({
      qty: l.qty * l.tentConfig!.bomParts[0]!.qtyRequired,
      start: l.order.startDate!,
      end: l.order.dueDateEnd!,
    }))

  const booked = maxConcurrentBooked(demand, from, to)
  return buildAvailability(stock, booked)
}

// ---------------------------------------------------------------------------
// Tent configuration availability (BOM-driven)
// ---------------------------------------------------------------------------

/**
 * How many of a given TentConfiguration can be built over [from, to].
 *
 *   for each part in config.BOM:
 *     partAvail = stock(part) - demand(part across all configs that use it)
 *     maxFromPart = floor(partAvail / qtyRequired)
 *   configAvail = min(maxFromPart) across all BOM rows
 */
// TODO[7]: N+1 — fires 2-3 DB queries per BOM part. Fix: batch-load all part stocks and order
// lines in 2 queries, then distribute to buildConfigAvailability.
export async function getTentConfigAvailability(
  tentConfigId: number,
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<ConfigAvailabilityShape & { bomComplete: boolean }> {
  const config = await prisma.tentConfiguration.findUnique({
    where: { id: tentConfigId },
    include: {
      bomParts: {
        include: {
          tentPart: { select: { id: true, name: true, isSerialized: true, qty: true } },
        },
      },
    },
  })
  if (!config) {
    return { ...buildConfigAvailability([]), bomComplete: false }
  }

  // If BOM incomplete, return zero-constraint (allow booking with warning)
  if (!config.bomComplete || config.bomParts.length === 0) {
    return { ...buildConfigAvailability([]), bomComplete: false }
  }

  const snapshots: PartSnapshot[] = await Promise.all(
    config.bomParts.map(async (row) => {
      const partAvail = await getTentPartAvailability(row.tentPartId, from, to, excludeOrderId)
      return {
        tentPartId: row.tentPartId,
        name: row.tentPart.name,
        stock: partAvail.stock,
        booked: partAvail.booked,
        qtyRequired: row.qtyRequired,
      }
    }),
  )

  return { ...buildConfigAvailability(snapshots), bomComplete: true }
}

// ---------------------------------------------------------------------------
// Bulk availability — batch helper for category list pages
// ---------------------------------------------------------------------------

/**
 * Returns a Map<itemId, AvailabilityShape> for many items at once.
 * Used by the category page to render badges in one round-trip per page.
 */
// TODO[7]: N+1 — fires 3 DB queries per item (findUnique + count + findMany). Fix: batch-load all
// items and their order lines in 2 queries, then call availability math per item.
export async function getBulkItemAvailability(
  itemIds: number[],
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<Map<number, AvailabilityShape>> {
  const out = new Map<number, AvailabilityShape>()
  // Naive parallel; fine for ~100 items.
  // Optimisation path: a single grouped query that aggregates by itemId.
  await Promise.all(
    itemIds.map(async (id) => {
      out.set(id, await getItemAvailability(id, from, to, excludeOrderId))
    }),
  )
  return out
}

export async function getBulkTentConfigAvailability(
  configIds: number[],
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<Map<number, ConfigAvailabilityShape & { bomComplete: boolean }>> {
  const out = new Map<number, ConfigAvailabilityShape & { bomComplete: boolean }>()
  await Promise.all(
    configIds.map(async (id) => {
      out.set(id, await getTentConfigAvailability(id, from, to, excludeOrderId))
    }),
  )
  return out
}

// ---------------------------------------------------------------------------
// Validation helper — call from POST /api/orders before persisting
// ---------------------------------------------------------------------------

export type ValidationLine = {
  kind: "item" | "tentConfig"
  refId: number
  qty: number
}

export type ValidationResult = {
  ok: boolean
  conflicts: {
    kind: "item" | "tentConfig"
    refId: number
    requested: number
    available: number
    reason: "out_of_stock" | "low_stock" | "bom_incomplete"
  }[]
  warnings: ValidationResult["conflicts"]
}

export async function validateOrderLines(
  lines: ValidationLine[],
  from: Date,
  to: Date,
  excludeOrderId?: number,
): Promise<ValidationResult> {
  const conflicts: ValidationResult["conflicts"] = []
  const warnings: ValidationResult["warnings"] = []

  for (const line of lines) {
    if (line.kind === "item") {
      const a = await getItemAvailability(line.refId, from, to, excludeOrderId)
      if (line.qty > a.available) {
        conflicts.push({
          kind: "item",
          refId: line.refId,
          requested: line.qty,
          available: a.available,
          reason: "out_of_stock",
        })
      } else if (a.isLow) {
        warnings.push({
          kind: "item",
          refId: line.refId,
          requested: line.qty,
          available: a.available,
          reason: "low_stock",
        })
      }
    } else {
      const a = await getTentConfigAvailability(line.refId, from, to, excludeOrderId)
      if (!a.bomComplete) {
        warnings.push({
          kind: "tentConfig",
          refId: line.refId,
          requested: line.qty,
          available: a.available,
          reason: "bom_incomplete",
        })
      } else if (line.qty > a.available) {
        conflicts.push({
          kind: "tentConfig",
          refId: line.refId,
          requested: line.qty,
          available: a.available,
          reason: "out_of_stock",
        })
      }
    }
  }

  return { ok: conflicts.length === 0, conflicts, warnings }
}

// ---------------------------------------------------------------------------
// Daily availability — per-day availability over a date range
// ---------------------------------------------------------------------------

/**
 * Returns per-day availability for an item for `days` days starting at `startDate`.
 * Uses a single DB query for the whole range, then filters per-day in memory.
 */
export async function getItemDailyAvailability(
  itemId: number,
  startDate: Date,
  days: number = 35,
): Promise<{ date: string; available: number; total: number }[]> {
  const rangeEnd = new Date(startDate)
  rangeEnd.setDate(rangeEnd.getDate() + days)

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { qty: true, category: { select: { isSerialized: true } } },
  })
  if (!item) return []

  const stock = item.category.isSerialized
    ? await prisma.serializedUnit.count({ where: { itemId, status: "available" } })
    : (item.qty ?? 0)

  const lines = await prisma.orderLineItem.findMany({
    where: {
      itemId,
      order: {
        startDate: { lt: rangeEnd },
        dueDateEnd: { gt: startDate },
        state: { consumesInventory: true },
      },
    },
    select: {
      qty: true,
      order: { select: { startDate: true, dueDateEnd: true } },
    },
  })

  const result: { date: string; available: number; total: number }[] = []
  for (let i = 0; i < days; i++) {
    const day = new Date(startDate)
    day.setDate(day.getDate() + i)
    day.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const booked = lines
      .filter(l => l.order.startDate !== null && l.order.dueDateEnd !== null
        && l.order.startDate <= dayEnd && l.order.dueDateEnd >= day)
      .reduce((sum, l) => sum + l.qty, 0)

    result.push({
      date: day.toISOString().slice(0, 10),
      available: Math.max(0, stock - booked),
      total: stock,
    })
  }
  return result
}

/**
 * Returns per-day availability for a tent configuration over `days` days
 * starting at `startDate`. For each day, computes the minimum buildable
 * count across all BOM parts. Uses one DB query per BOM part for the
 * whole range, then distributes per-day in memory.
 *
 * Returns all-zeros if the BOM is incomplete or the config doesn't exist.
 */
export async function getTentConfigDailyAvailability(
  configId: number,
  startDate: Date,
  days: number = 60,
): Promise<{ date: string; available: number; total: number }[]> {
  const rangeEnd = new Date(startDate)
  rangeEnd.setDate(rangeEnd.getDate() + days)

  const config = await prisma.tentConfiguration.findUnique({
    where: { id: configId },
    include: {
      bomParts: {
        include: {
          tentPart: { select: { id: true, qty: true, isSerialized: true } },
        },
      },
    },
  })

  const zeros = Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    return { date: fmtLocalDate(d), available: 0, total: 0 }
  })

  if (!config || !config.bomComplete || config.bomParts.length === 0) return zeros

  // Per-part: load stock + all overlapping order lines
  const partData = await Promise.all(
    config.bomParts.map(async (row) => {
      const stock =
        row.tentPart.isSerialized && row.tentPart.qty === null
          ? await prisma.serializedUnit.count({
              where: { tentPartId: row.tentPart.id, status: "available" },
            })
          : (row.tentPart.qty ?? 0)

      const lines = await prisma.orderLineItem.findMany({
        where: {
          tentConfigId: { not: null },
          order: {
            startDate: { lt: rangeEnd },
            dueDateEnd: { gt: startDate },
            state: { consumesInventory: true },
          },
          tentConfig: { bomParts: { some: { tentPartId: row.tentPart.id } } },
        },
        select: {
          qty: true,
          order: { select: { startDate: true, dueDateEnd: true } },
          tentConfig: {
            select: {
              bomParts: {
                where: { tentPartId: row.tentPart.id },
                select: { qtyRequired: true },
              },
            },
          },
        },
      })

      return { qtyRequired: row.qtyRequired, stock, lines }
    }),
  )

  return zeros.map(({ date }) => {
    const day = new Date(date)
    day.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    let minAvail = Infinity
    let minTotal = Infinity

    for (const part of partData) {
      const bookedQty = part.lines
        .filter(
          (l) =>
            l.order.startDate !== null &&
            l.order.dueDateEnd !== null &&
            l.order.startDate <= dayEnd &&
            l.order.dueDateEnd >= day,
        )
        .reduce((sum, l) => sum + l.qty * (l.tentConfig?.bomParts[0]?.qtyRequired ?? 0), 0)

      minAvail = Math.min(minAvail, Math.floor(Math.max(0, part.stock - bookedQty) / part.qtyRequired))
      minTotal = Math.min(minTotal, Math.floor(part.stock / part.qtyRequired))
    }

    return {
      date,
      available: minAvail === Infinity ? 0 : minAvail,
      total: minTotal === Infinity ? 0 : minTotal,
    }
  })
}

// ---------------------------------------------------------------------------
// Physical buildable count — no booking factor, admin inventory view only
// ---------------------------------------------------------------------------

/**
 * How many of a tent configuration can be built from owned physical stock,
 * ignoring all bookings. Used exclusively by the admin Inventory view.
 *
 * Returns the full config shape needed by AdminTentConfigSummary.
 */
export async function getTentConfigBuildableCount(
  tentConfigId: number,
): Promise<Omit<AdminTentConfigSummary, "id" | "name" | "widthFt" | "lengthFt" | "isActive">> {
  const config = await prisma.tentConfiguration.findUnique({
    where: { id: tentConfigId },
    include: {
      bomParts: {
        include: {
          tentPart: {
            select: { id: true, name: true, partType: true, isSerialized: true, qty: true },
          },
        },
      },
    },
  })

  if (!config || !config.bomComplete || config.bomParts.length === 0) {
    return {
      bomComplete: config?.bomComplete ?? false,
      canBuild: 0,
      bottleneck: null,
      bomParts: [],
    }
  }

  const parts: BuildablePart[] = await Promise.all(
    config.bomParts.map(async (row) => {
      // Use qty when it's explicitly set; only count SerializedUnits when truly serialized (qty=null).
      const stock = (row.tentPart.isSerialized && row.tentPart.qty === null)
        ? await prisma.serializedUnit.count({ where: { tentPartId: row.tentPartId, status: "available" } })
        : (row.tentPart.qty ?? 0)
      return {
        tentPartId: row.tentPartId,
        name: row.tentPart.name,
        stock,
        qtyRequired: row.qtyRequired,
      }
    }),
  )

  const { canBuild, bottleneck } = calcBuildableFromParts(parts)

  return {
    bomComplete: true,
    canBuild,
    bottleneck,
    bomParts: config.bomParts.map(row => ({
      tentPartId: row.tentPartId,
      name: row.tentPart.name,
      partType: row.tentPart.partType,
      qtyRequired: row.qtyRequired,
    })),
  }
}
