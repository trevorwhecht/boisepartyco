# Boise Party Rentals — Master Implementation Plan

> **For agentic workers:** Execute groups sequentially. Each group has its own plan file.
> Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Goal:** Transform boisepartyco from a quoting template into a full-featured public-facing rental website with real inventory, live availability, and a customer-facing shop.

**Design reference:** `~/Downloads/design-prototype/` — open `index.html` in a browser to see the target UI.

---

## Group Dependency Order

```
G1 (Foundation)
  └── G2 (Inventory API)
        └── G3 (Shop Infrastructure)   ← runs after G2
              ├── G4 (Shop Pages)      ← runs after G3
              └── G5 (Admin Cleanup)   ← runs after G3 (uses (app)/ paths G3 creates)
```

G1 and G2 are prerequisites for everything. G5 requires G3 because G3 moves `get-quote/` and `dashboard/` into the `(app)/` route group that G5 modifies.

---

## The Five Groups

| Group | Plan file | What it delivers | Prereq |
|---|---|---|---|
| **G1** | [2026-05-19-g1-foundation.md](2026-05-19-g1-foundation.md) | Schema migration, availability service, seed with real inventory | — |
| **G2** | [2026-05-19-g2-inventory-api.md](2026-05-19-g2-inventory-api.md) | All `/api/inventory/*` routes, extended order creation | G1 |
| **G3** | [2026-05-19-g3-shop-infrastructure.md](2026-05-19-g3-shop-infrastructure.md) | App route restructure, design tokens, Cart + DateRange, Header/Footer | G2 |
| **G4** | [2026-05-19-g4-shop-pages.md](2026-05-19-g4-shop-pages.md) | Home, category, item detail, quote/cart, gallery, FAQ, contact pages | G3 |
| **G5** | [2026-05-19-g5-admin-cleanup.md](2026-05-19-g5-admin-cleanup.md) | Remove LineItemPresets, update admin dashboard for new inventory model | G2 + G3 |

---

## Architecture Overview

### Public shop routes (new)
```
/                    → Home — hero, category cards, featured items, how-it-works
/tents               → Tent category page (server component, availability from URL params)
/tables-and-chairs   → Tables & Chairs category page
/decor               → Decor & Dance Floor category page
/shop/[slug]         → Item or tent-config detail page
/quote               → Cart review → contact form → submit → confirmation
/gallery             → Photo gallery (static)
/faq                 → FAQ (static)
/contact             → Contact form
```

### App routes (existing, moved to (app)/ route group in G3)
```
/dashboard           → Admin kanban + order management (unchanged)
/get-quote           → Staff/admin quote builder (unchanged, LineItemPresets removed in G5)
/quote-builder       → Admin quote builder (unchanged)
/account             → Customer account + order history (unchanged)
/orders/[token]      → Shareable order page (unchanged)
/login, /register    → Auth (unchanged)
```

### API
```
GET  /api/inventory/categories               → Category list
GET  /api/inventory/items                    → Items (filter by categoryId, from, to) — no ?search= param
GET  /api/inventory/items/[slug]             → Item detail + availability
GET  /api/inventory/tent-configurations      → Tent configs + availability
GET  /api/inventory/tent-configurations/[slug] → Config detail + availability
GET  /api/inventory/availability             → Batch availability check
POST /api/orders                             → Extended: detects pickupDate → public shop handler (CreateOrderPayload)
```

**Key service functions (from G1 + G2):**
- `validateOrderLines(lines, from, to)` — validates availability; returns `{ ok, conflicts, warnings }` — required by POST /api/orders public shop handler
- `getItemDailyAvailability(itemId, startDate, days?)` — 35-day per-day availability for detail page strip (added in G4 Task 2)
- `CreateOrderPayload` shape: `{ pickupDate, dropoffDate, customer: { firstName, lastName, email, phone }, lines: [{ kind, refId, qty }], customerNotes? }`

### Key design decisions
- **Date range in URL params** (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) — pages are server-rendered with live availability, shareable links show correct data
- **Cart in localStorage-backed client context** — persists across navigation, cleared on quote submit
- **`consumesInventory` flag** on OrderState — inventory is only "consumed" once admin sets state to sortOrder ≥ 3 (post-deposit)
- **No OrderLineItemVariant** — each color/style/size is its own Item SKU (dropped in G1 migration)
- **BOM-driven tent availability** — TentConfiguration.bomParts drive part-level demand; configs with incomplete BOM are bookable but flagged

### Design tokens (added to globals.css in G3)
```css
--shop-blue: #1f6fb2        /* primary CTA, links, active states */
--shop-blue-deep: #14507f   /* dark header bar */
--shop-blue-soft: #e9f2fa   /* light blue backgrounds */
--shop-ink: #1a2433          /* primary text */
--shop-ink-soft: #4a5666     /* secondary text */
--shop-line: #e4e7ec         /* borders */
--shop-paper: #f7f6f3        /* page background, card backgrounds */
--shop-warn: #c0613a         /* out-of-stock, overbook warning */
--shop-ok: #2f7d52           /* available (green) */
```

### Fonts (added to root layout in G3)
- **Cormorant Garamond** — serif, headings (h1-h3 on public pages)
- **Inter** — sans-serif, body (already system default)
- **JetBrains Mono** — mono, prices and stats

---

## Known gaps (accepted, not bugs)

- **`GET /api/inventory/items` has no `?search=` param** — G5's admin item search filters the full item list client-side after a single `GET /api/inventory/items` fetch on dialog mount.
- **Admin notifications for public shop quotes** — The `handlePublicShopQuote` helper in G2 does not send admin notifications. The existing staff-path POST does; public shop quotes will appear on the dashboard on next load without a notification badge.
- **Contact form not wired to email** — `/contact` has a UI form that calls `e.preventDefault()` but sends no email. Wiring to an email API is a future enhancement.
- **Cart item links in QuotePage** — Cart lines link as `<span>` (not `<Link>`) because `CartLine` stores `refId` (numeric ID), not `slug`. Adding slug to CartLine is a future enhancement.

---

## What's NOT in this master plan (future rounds)

- Admin BOM editor (`PUT /api/admin/tent-configs/:id/bom`)
- Booking calendar / inventory-load views for admin
- Serialized unit bulk entry (`POST /api/admin/serialized-units/bulk`)
- Image uploads via Cloudinary (ItemImage rows)
- Pricing tiers (wholesale vs. retail)
- Hold states with expiry (`holdExpiresAt`)
- Customer auth integration with the public cart (currently cart → guest quote)
