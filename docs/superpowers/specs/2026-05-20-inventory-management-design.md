# Spec — Admin Inventory Management

**Date:** 2026-05-20
**Status:** Ready for implementation plan

---

## 1. Overview

An **Inventory** view inside the admin dashboard that lets admins manage the physical quantities of every rental item and tent part they own, and lets employees view those quantities plus tent configuration packing lists.

**What this spec covers:**
- `?view=inventory` in the admin dashboard
- Sidebar + account dropdown navigation entry
- Quantity editing for `Item.qty` and `TentPart.qty`
- Derived tent configuration buildable counts (from BOM, not booking availability)
- Active toggle + primary image URL editing per item (admin only)
- Tent configuration packing list (visible to employees, primary home is future order dashboard modal)
- Role-based access: admins edit, employees view

**Out of scope (future features noted):**
- Full Item CRUD (create / delete items, edit names, specs, descriptions) — separate future feature
- Serialized unit management (individual serial numbers per physical asset)
- Image uploads (Cloudinary or similar) — URL editing only for now
- Booking-date availability view (that's the shop's availability system)
- Tent configuration packing list in the order dashboard modal — future spec

---

## 2. Navigation

### Sidebar (`Dashboard-Sidebar.tsx`)

Add an **Inventory** link for both `admin` and `employee` roles, between the Orders group and the admin-only section:

```
Orders
  ↳ Calendar
  ↳ Complete
  ↳ Archive
Inventory          ← new (admin + employee)
── admin only ──
Insights
Users
Settings
```

Icon: `Package` from lucide-react. URL: `?view=inventory`.

### Account dropdown (`Navbar-AccountPanel.tsx`)

Add an **Inventory** link pointing to `/dashboard?view=inventory`. Visible only when `session.user.role === "admin" || "employee"`. Positioned above Settings in the dropdown.

---

## 3. View Structure

### Container

`src/app/(app)/dashboard/components/views/Dashboard-InventoryView.tsx`

- Fetches all **active** categories on mount via `GET /api/admin/inventory/categories`
- Builds tab list dynamically from `Category.sortOrder` — no hardcoded category names
- Passes `role` down to all child components to control edit vs. read-only rendering

### Tab navigation

**Desktop (`md+`):** shadcn `<Tabs>` horizontal strip. One tab per category.

**Mobile (`< md`):** shadcn `<Select>` dropdown replaces the tab strip (`flex md:hidden` / `hidden md:flex`). Same options and active state, same content renders below.

**Tab order:** follows `Category.sortOrder` from the DB. No pinning — Tents tab appears wherever seeded.

The Tent category (`slug: "tent"`) renders `Dashboard-InventoryView-TentsTab.tsx`. All other categories render `Dashboard-InventoryView-CategoryTab.tsx`.

---

## 4. Non-Tent Category Tabs

**Component:** `Dashboard-InventoryView-CategoryTab.tsx`

Receives `categoryId` and `role` as props. Fetches `GET /api/admin/inventory/items?categoryId={id}` on mount.

### Table (all roles)

| Column | Notes |
|---|---|
| Name | Item display name |
| SKU | Monospace, read-only identifier |
| Qty Owned | `Item.qty` value |
| Active | Green "✓" badge / red "Off" badge |

**Admin:** rows are clickable (pointer cursor, hover highlight `bg-(--color-surface)`). Clicking a row opens the item side sheet.

**Employee:** rows are not clickable — table is informational only. No hover state, no side sheet.

### Item Side Sheet (admin only)

**Desktop:** `<Sheet side="right">` — slides in alongside the table.
**Mobile:** `<Dialog>` — full modal overlay. Controlled by a `useMediaQuery("(max-width: 768px)")` hook (or Tailwind breakpoint detection) — same open state, different container component.

Fields:
| Field | Editable | Notes |
|---|---|---|
| Name | No | Read-only display |
| SKU | No | Read-only, monospace |
| Qty Owned | Yes (admin) | Number input, min 0, required |
| Active | Yes (admin) | Toggle switch |
| Primary Image URL | Yes (admin) | Text input, optional |

**Save:** `PATCH /api/admin/inventory/items/[id]` with `{ qty, isActive, primaryImageUrl }`. Uses `useTransition` + `Loader2` spinner. On success: update the row in local state (no full refetch). On error: `toast.error(message)`.

**Cancel / close:** discards unsaved changes, closes sheet/modal.

---

## 5. Tent Tab

**Component:** `Dashboard-InventoryView-TentsTab.tsx`

Fetches two endpoints in parallel on mount:
- `GET /api/admin/inventory/tent-parts` — all tent parts
- `GET /api/admin/inventory/tent-configurations` — configs with derived buildable count + BOM

### Admin View — Two Sections

**Section 1: Tent Parts table**

| Column | Notes |
|---|---|
| Part Name | e.g. "Standard Panel 10ft" |
| Type | panel / pole / crown / hardware |
| Qty Owned | `TentPart.qty` |

Rows are clickable (admin). Opens the Tent Part side sheet.

**Tent Part Side Sheet (admin only):**
- Part name (read-only)
- Type (read-only)
- Qty Owned — number input, editable, min 0
- Save → `PATCH /api/admin/inventory/tent-parts/[id]`
- Same sheet/modal responsive behavior as item sheet

**Section 2: Tent Configurations table**

| Column | Notes |
|---|---|
| Configuration | Name (e.g. "20×20 Frame Tent") |
| Can Build | Derived from BOM (see Section 7). Green if > 0, amber if constrained, "—" if BOM incomplete |
| Bottleneck | Limiting part + explanation (e.g. "Panel — need 8, have 40 → 5 max"). Hidden if not constrained. |
| BOM | "✓ Complete" badge (green) or "⚠ Incomplete" badge (yellow) |

Rows are clickable for both admin and employee. Opens the Tent Config sheet (packing list).

**Tent Config Sheet (admin + employee, read-only):**
- Config name + dimensions (read-only)
- Can Build count
- Parts manifest list: each BOM row as "Part Name × qtyRequired"
- If admin and bottleneck exists: amber callout identifying the limiting part
- If Can Build is 0 or BOM is incomplete: appropriate warning note
- No edit fields — this sheet is always read-only

### Employee View — One Section Only

Only the Tent Configurations table is shown. The Tent Parts section is hidden entirely.

Table columns: **Configuration** and **Can Build** only. No Bottleneck or BOM columns.

Rows are clickable. Opens the same Tent Config packing list sheet, but without the admin bottleneck callout. A note is shown: "Contact an admin to update tent part quantities."

---

## 6. API Layer

All routes under `/api/admin/inventory/*`. Auth guard on every route: require `admin` or `employee` session (redirect to `/login` if unauthenticated). PATCH routes additionally require `admin` role (return 403 for employees).

### GET `/api/admin/inventory/categories`

Returns all active categories ordered by `sortOrder`. Used to build the tab list.

```ts
// Response shape
{ data: { id, slug, name, sortOrder }[], error: null }
```

### GET `/api/admin/inventory/items?categoryId={id}`

Returns all items (including inactive) for a category. Admin-only fields included (`cost` stripped for employees — not needed here anyway).

```ts
// Response shape
{ data: { id, sku, slug, name, qty, isActive, primaryImageUrl, sortOrder }[], error: null }
```

### PATCH `/api/admin/inventory/items/[id]`

Admin only. Accepts `{ qty?: number, isActive?: boolean, primaryImageUrl?: string | null }`.

Validates: `qty` must be integer ≥ 0 if provided. Returns updated item shape.

### GET `/api/admin/inventory/tent-parts`

Returns all tent parts ordered by `partType`, then `name`.

```ts
// Response shape
{ data: { id, name, partType, qty, isSerialized, isActive }[], error: null }
```

### PATCH `/api/admin/inventory/tent-parts/[id]`

Admin only. Accepts `{ qty: number }`. Validates: integer ≥ 0. Returns updated tent part.

### GET `/api/admin/inventory/tent-configurations`

Returns all tent configurations with derived buildable count and full BOM. Buildable count is computed server-side using `getTentConfigBuildableCount()` (see Section 7).

```ts
// Response shape
{
  data: {
    id: number
    slug: string
    name: string
    widthFt: number
    lengthFt: number
    isActive: boolean
    bomComplete: boolean
    canBuild: number          // 0 if BOM incomplete
    bottleneck: {             // null if no bottleneck
      tentPartId: number
      name: string
      stock: number
      qtyRequired: number
      maxFromThisPart: number
    } | null
    bomParts: {
      tentPartId: number
      name: string
      partType: string
      qtyRequired: number
    }[]
  }[],
  error: null
}
```

---

## 7. New Service Function

**`getTentConfigBuildableCount(configId: number)`** — added to `src/services/inventoryService.ts`.

Distinct from the existing availability functions which factor in bookings and date ranges. This function answers: *"How many of this config can we physically build right now, ignoring all bookings?"*

```
For each part in config.BOM:
  stock = TentPart.qty (or count of available SerializedUnits if isSerialized)
  maxFromThisPart = floor(stock / qtyRequired)

canBuild = min(maxFromThisPart) across all BOM rows
bottleneck = the part with the lowest maxFromThisPart (if it limits the result)
```

Returns `{ canBuild, bottleneck, bomComplete }`.

If `bomComplete === false` or BOM has zero parts: return `{ canBuild: 0, bottleneck: null, bomComplete: false }`.

---

## 8. File Structure

### New files

```
src/app/(app)/dashboard/components/views/
  Dashboard-InventoryView.tsx                          ← main container, tab logic
  inventory/
    Dashboard-InventoryView-CategoryTab.tsx            ← generic category tab
    Dashboard-InventoryView-TentsTab.tsx               ← tent-specific tab (admin + employee)
    Dashboard-InventoryView-ItemSheet.tsx              ← item edit sheet/modal
    Dashboard-InventoryView-TentPartSheet.tsx          ← tent part edit sheet/modal
    Dashboard-InventoryView-TentConfigSheet.tsx        ← packing list sheet (read-only, both roles)

src/app/api/admin/inventory/
  categories/route.ts                                  ← GET categories
  items/route.ts                                       ← GET items by categoryId
  items/[id]/route.ts                                  ← PATCH item
  tent-parts/route.ts                                  ← GET tent parts
  tent-parts/[id]/route.ts                             ← PATCH tent part
  tent-configurations/route.ts                         ← GET configs with buildable count
```

### Modified files

| File | Change |
|---|---|
| `src/app/(app)/dashboard/components/Dashboard-Sidebar.tsx` | Add Inventory `<SidebarLink>` for admin + employee |
| `src/app/(app)/dashboard/Dashboard.tsx` | Add `case "inventory"` rendering `<DashboardInventoryView>` |
| `src/components/shared/layout/Navbar-AccountPanel.tsx` | Add Inventory link for admin + employee roles |
| `src/services/inventoryService.ts` | Add `getTentConfigBuildableCount()` |

---

## 9. Role Summary

| Action | Admin | Employee |
|---|---|---|
| See Inventory in sidebar + dropdown | ✓ | ✓ |
| View item quantities (non-tent) | ✓ | ✓ |
| Edit item qty / active / image | ✓ | ✗ |
| View tent configurations (Can Build) | ✓ | ✓ |
| View tent config packing list | ✓ | ✓ |
| View tent parts section | ✓ | ✗ |
| Edit tent part qty | ✓ | ✗ |
| See bottleneck info | ✓ | ✗ |

---

## 10. Known Gaps (accepted)

- **Item CRUD** — adding new items, editing names/specs/descriptions — future feature. Side sheet is intentionally read-only for those fields.
- **Serialized unit management** — tent parts and items with `isSerialized: true` show qty from `SerializedUnit` count (read-only). Bulk add/edit of serialized units is a future feature.
- **Image uploads** — image URL is editable as plain text. Cloudinary/storage integration is a future feature.
- **Packing list in order modal** — employee packing list here is a preview; the primary home is the order dashboard modal, which is a separate future spec.
- **Inactive items** — the admin GET endpoint returns all items including inactive ones so admins can toggle them back on.
