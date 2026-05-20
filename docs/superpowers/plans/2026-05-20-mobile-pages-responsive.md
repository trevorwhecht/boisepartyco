# Mobile Responsiveness — Remaining Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public-facing Quote page, Shop detail page, and Footer fully responsive on mobile (375–768px) by converting fixed inline grids to Tailwind responsive layouts.

**Architecture:** Three independent fixes, each isolated to one file (except Task 1+2 which are both in QuotePage.tsx). All use the same pattern: remove `style={{ gridTemplateColumns: "..." }}`, replace with Tailwind 4 `grid-cols-1 md:grid-cols-[...]`. Cart line items use the same flex-on-mobile/grid-on-desktop pattern established in ItemCard-List.tsx.

**Tech Stack:** Next.js App Router · React 19 · Tailwind 4 · CSS variables (`--shop-*`) · no test framework (UI layout — verify visually)

---

## File Map

| Action | File | What changes |
|---|---|---|
| **Modify** | `src/app/(public)/quote/QuotePage.tsx` | Fix 2-col layout, page header padding/font, cart line items, sidebar sticky |
| **Modify** | `src/app/(public)/shop/[slug]/page.tsx` | Fix 2-col layout, breadcrumb padding, h1 font size |
| **Modify** | `src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx` | Wrap 35-col grid in horizontal scroll container |
| **Modify** | `src/components/shared/layout/ShopFooter.tsx` | Fix 4-col footer grid, convert padding to Tailwind |

---

## Task 1: QuotePage — responsive page header + two-column layout

**Files:**
- Modify: `src/app/(public)/quote/QuotePage.tsx`

The page has three problems in its outer shell:
1. `px-8` on mobile = 32px each side; on 375px screens this leaves only 311px for content
2. `style={{ gridTemplateColumns: "1.6fr 1fr" }}` forces two columns on all screen sizes — the sidebar crushes on mobile
3. `h1 style={{ fontSize: 56 }}` is too large for mobile

**Target mobile layout:**
- Page header: responsive padding, h1 scales from 28px to 56px
- Main body: single column (main content first, price summary below)
- Sidebar: not sticky on mobile (`md:sticky md:top-28`)

- [ ] **Step 1: Fix the page header section**

In `src/app/(public)/quote/QuotePage.tsx`, find and replace the page header section (around line 101–109):

**Find:**
```tsx
      {/* Page header */}
      <section className="py-12" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Your Quote</span>
          </p>
          <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 56 }}>Your quote</h1>
          <p className="mt-2 text-base text-(--shop-ink-soft)">Review your list, confirm dates, and we'll come back within 4 business hours.</p>
        </div>
      </section>
```

**Replace with:**
```tsx
      {/* Page header */}
      <section className="py-8 md:py-12" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4 md:px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Your Quote</span>
          </p>
          <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(28px, 8vw, 56px)" }}>Your quote</h1>
          <p className="mt-2 text-base text-(--shop-ink-soft)">Review your list, confirm dates, and we'll come back within 4 business hours.</p>
        </div>
      </section>
```

- [ ] **Step 2: Fix the main two-column grid section**

Find and replace (around line 111–113):

**Find:**
```tsx
      <section className="py-10 pb-20">
        <div className="max-w-330 mx-auto px-8 grid gap-12 items-start"
          style={{ gridTemplateColumns: "1.6fr 1fr" }}>
```

**Replace with:**
```tsx
      <section className="py-8 md:py-10 pb-20">
        <div className="max-w-330 mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8 md:gap-12 items-start">
```

- [ ] **Step 3: Fix the sidebar sticky positioning**

Find (around line 258):

**Find:**
```tsx
          <aside className="bg-white border border-(--shop-line) rounded-xl p-6 sticky top-[170px]">
```

**Replace with:**
```tsx
          <aside className="bg-white border border-(--shop-line) rounded-xl p-6 md:sticky md:top-28">
```

- [ ] **Step 4: Verify visually — layout**

```bash
npm run dev
```

Navigate to `http://localhost:3000/quote` in a browser. Set DevTools to iPhone 12 Pro (390px wide). Verify:
- Page header: breadcrumb + h1 + subtitle fit within the screen with visible padding on both sides
- h1 is readable (~28–32px) — not cut off at screen edges
- Main section: the cart area takes full width, the price summary is below (stacked, not side by side)
- No horizontal scroll bar

Then switch to desktop (1280px+). Verify:
- Two-column layout restored (main content left, price summary right)
- Price summary is sticky as user scrolls through long item lists

---

## Task 2: QuotePage — responsive cart line items

**Files:**
- Modify: `src/app/(public)/quote/QuotePage.tsx` (continued)

The cart line items use `style={{ gridTemplateColumns: "72px 1fr auto auto auto" }}` — 5 fixed columns that collapse to ~60px each on mobile. Replace with the same flex-on-mobile / grid-on-desktop pattern used in `ItemCard-List.tsx`.

**Target mobile layout per line item:**
```
[img 64px]  [Name]
            [$/day · N days]
            [qty stepper]  [total $]  [✕]
```

**Target desktop layout:** Same 5-column grid as today.

- [ ] **Step 1: Replace the cart line item render block**

In `src/app/(public)/quote/QuotePage.tsx`, find the cart line item mapping (around lines 144–170):

**Find:**
```tsx
                  {lines.map((line, idx) => (
                    <div key={`${line.kind}-${line.refId}`}
                      className="grid gap-5 p-4 items-center"
                      style={{
                        gridTemplateColumns: "72px 1fr auto auto auto",
                        borderBottom: idx < lines.length - 1 ? "1px solid #f0f2f5" : "none",
                      }}>
                      <div className="aspect-square bg-(--shop-paper) rounded-lg" />
                      <div>
                        <span className="serif text-xl font-medium text-(--shop-ink)">{line.name}</span>
                        <div className="text-xs text-(--shop-ink-soft) mt-0.5">
                          ${line.unitPrice.toFixed(0)}/day · {days} day{days === 1 ? "" : "s"}
                        </div>
                      </div>
                      <QtyStepper compact value={line.qty} min={1} max={99}
                        onChange={(q) => updateLine(line.refId, line.kind, q)} />
                      <div className="mono text-sm font-semibold text-right min-w-[72px]">
                        ${fmtCurrency(line.unitPrice * line.qty * days)}
                      </div>
                      <button onClick={() => removeLine(line.refId, line.kind)}
                        className="w-8 h-8 border border-(--shop-line) bg-white rounded-lg flex items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
```

**Replace with:**
```tsx
                  {lines.map((line, idx) => (
                    <div key={`${line.kind}-${line.refId}`}
                      className="flex gap-3 p-3.5 items-start md:grid md:gap-5 md:p-4 md:items-center md:grid-cols-[72px_1fr_auto_auto_auto]"
                      style={{ borderBottom: idx < lines.length - 1 ? "1px solid #f0f2f5" : "none" }}>
                      {/* Image placeholder */}
                      <div className="w-16 shrink-0 aspect-square bg-(--shop-paper) rounded-lg md:w-auto" />
                      {/* Name + mobile controls */}
                      <div className="flex-1 min-w-0">
                        <span className="serif text-lg md:text-xl font-medium text-(--shop-ink)">{line.name}</span>
                        <div className="text-xs text-(--shop-ink-soft) mt-0.5">
                          ${line.unitPrice.toFixed(0)}/day · {days} day{days === 1 ? "" : "s"}
                        </div>
                        {/* Mobile-only controls row */}
                        <div className="flex items-center gap-2 mt-2.5 md:hidden">
                          <QtyStepper compact value={line.qty} min={1} max={99}
                            onChange={(q) => updateLine(line.refId, line.kind, q)} />
                          <div className="ml-auto mono text-sm font-semibold whitespace-nowrap">
                            ${fmtCurrency(line.unitPrice * line.qty * days)}
                          </div>
                          <button onClick={() => removeLine(line.refId, line.kind)}
                            className="w-8 h-8 border border-(--shop-line) bg-white rounded-lg flex items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {/* Desktop-only: qty stepper */}
                      <div className="hidden md:block">
                        <QtyStepper compact value={line.qty} min={1} max={99}
                          onChange={(q) => updateLine(line.refId, line.kind, q)} />
                      </div>
                      {/* Desktop-only: total price */}
                      <div className="hidden md:block mono text-sm font-semibold text-right min-w-18">
                        ${fmtCurrency(line.unitPrice * line.qty * days)}
                      </div>
                      {/* Desktop-only: remove button */}
                      <button onClick={() => removeLine(line.refId, line.kind)}
                        className="hidden md:flex w-8 h-8 border border-(--shop-line) bg-white rounded-lg items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
```

- [ ] **Step 2: Verify visually — cart items**

Navigate to `http://localhost:3000/quote` in DevTools iPhone 12 Pro mode. Add an item to the cart first (go to `/tents`, add something, come back). Verify:
- Each cart line item shows: thumbnail left, name + price-per-day text right, then stepper + total + remove in a row below on mobile
- No 5-column squash — content is readable
- Qty stepper tappable (min 44px touch target — QtyStepper has compact mode, check it's still large enough)
- Remove (✕) button tappable

On desktop (1280px): verify the 5-column layout is intact — thumbnail, name, stepper, total, remove — all in a single horizontal row.

- [ ] **Step 3: Commit QuotePage changes**

```bash
git add src/app/(public)/quote/QuotePage.tsx
git commit -m "fix: mobile-responsive quote page layout and cart line items"
```

---

## Task 3: Shop detail page — responsive layout + breadcrumbs + 35-day strip

**Files:**
- Modify: `src/app/(public)/shop/[slug]/page.tsx`
- Modify: `src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx`

Three issues:
1. `style={{ gridTemplateColumns: "1.2fr 1fr" }}` appears twice (item detail + tent config detail)
2. `px-8` without mobile padding on breadcrumb + 35-day strip sections
3. `ThirtyDayStrip` renders 35 equally-sized columns — on mobile each cell would be ~10px wide

- [ ] **Step 1: Fix breadcrumb section padding (appears twice)**

In `src/app/(public)/shop/[slug]/page.tsx`, find the breadcrumb container (appears identically for both item and tent config branches):

**Find both occurrences of:**
```tsx
          <div className="max-w-330 mx-auto px-8 text-xs text-(--shop-ink-soft)">
```

**Replace both with:**
```tsx
          <div className="max-w-330 mx-auto px-4 md:px-8 text-xs text-(--shop-ink-soft)">
```

Use find-and-replace-all for this (it's identical in both branches).

- [ ] **Step 2: Fix the item detail two-column grid**

Find the item detail section grid (around line 64–65):

**Find:**
```tsx
          <div className="max-w-330 mx-auto px-8 pt-6 grid gap-16 items-start"
            style={{ gridTemplateColumns: "1.2fr 1fr" }}>
```

**Replace with:**
```tsx
          <div className="max-w-330 mx-auto px-4 md:px-8 pt-6 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-16 items-start">
```

- [ ] **Step 3: Fix the item h1 font size**

Find (around line 81):
```tsx
              <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>
                {item.name}
              </h1>
```

Replace with:
```tsx
              <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(28px, 7vw, 48px)" }}>
                {item.name}
              </h1>
```

- [ ] **Step 4: Fix the 35-day strip section padding**

Find (around line 106–108):
```tsx
        <section className="py-16 border-t border-(--shop-line)">
          <div className="max-w-330 mx-auto px-8">
```

Replace with:
```tsx
        <section className="py-10 md:py-16 border-t border-(--shop-line)">
          <div className="max-w-330 mx-auto px-4 md:px-8">
```

- [ ] **Step 5: Fix the tent config detail two-column grid**

Find the tent config section grid (around line 157–158 — second occurrence of `gridTemplateColumns`):

**Find:**
```tsx
        <div className="max-w-330 mx-auto px-8 pt-6 grid gap-16 items-start"
          style={{ gridTemplateColumns: "1.2fr 1fr" }}>
```

**Replace with:**
```tsx
        <div className="max-w-330 mx-auto px-4 md:px-8 pt-6 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 md:gap-16 items-start">
```

- [ ] **Step 6: Fix the tent config h1 font size**

Find (around line 162):
```tsx
            <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: 48 }}>{config.name}</h1>
```

Replace with:
```tsx
            <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(28px, 7vw, 48px)" }}>{config.name}</h1>
```

- [ ] **Step 7: Fix ThirtyDayStrip — wrap in horizontal scroll container**

In `src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx`, find the grid (around line 30):

**Find:**
```tsx
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
```

**Replace with:**
```tsx
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <div className="grid gap-1 min-w-[560px]" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
```

And close the wrapper div after the map:

**Find:**
```tsx
        ))}
      </div>
    </div>
```

**Replace with:**
```tsx
        ))}
      </div>
      </div>
    </div>
```

The `-mx-4 px-4` bleed trick lets the scroll container extend to screen edges on mobile (so the scroll bar doesn't appear inside the page padding), while `min-w-[560px]` ensures each of the 35 cells is at least 16px wide and readable. `md:mx-0 md:px-0` reverts this on desktop where there's enough room.

- [ ] **Step 8: Verify visually — shop detail page**

Navigate to a tent detail page e.g. `http://localhost:3000/shop/20x20-frame-tent` in DevTools iPhone 12 Pro. Verify:
- Breadcrumb is inside padded content area (not edge-to-edge)
- Gallery placeholder (or image) takes full width on mobile
- Details/booking panel stacks below the gallery (not side by side)
- h1 is readable (~28–32px)
- 35-day strip is horizontally scrollable — cells are readable (at least 14–16px wide)
- No horizontal scroll on the page itself (only inside the strip)

- [ ] **Step 9: Commit shop detail changes**

```bash
git add src/app/(public)/shop/[slug]/page.tsx src/app/(public)/shop/[slug]/ThirtyDayStrip.tsx
git commit -m "fix: mobile-responsive shop detail page and scrollable 35-day strip"
```

---

## Task 4: ShopFooter — responsive mobile layout

**Files:**
- Modify: `src/components/shared/layout/ShopFooter.tsx`

The footer uses `display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 60` with `padding: "0 32px"`. On mobile this creates 4 very narrow columns (each ~70px). Replace with Tailwind responsive grid and padding.

**Target mobile layout:** Single column, stacked:
1. Logo + tagline
2. Rentals links
3. Help links
4. Visit / contact

**Target desktop layout:** 4 columns (unchanged).

- [ ] **Step 1: Replace the footer grid container**

In `src/components/shared/layout/ShopFooter.tsx`, find (around line 8):

**Find:**
```tsx
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 32px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 60 }}>
```

**Replace with:**
```tsx
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 md:gap-15">
```

- [ ] **Step 2: Fix the copyright bar padding**

Find (around line 40):
```tsx
      <div style={{ maxWidth: 1320, margin: "40px auto 0", padding: "20px 32px 0", borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", justifyContent: "space-between", fontSize: 12.5, opacity: 0.65 }}>
```

Replace with:
```tsx
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 flex justify-between" style={{ margin: "40px auto 0", padding: "20px 0 0", borderTop: "1px solid rgba(255,255,255,0.15)", fontSize: 12.5, opacity: 0.65 }}>
```

Note: the `padding` shorthand is split — the top/bottom padding `20px 0 0` stays inline, the left/right padding `px-4 md:px-8` is Tailwind. The `maxWidth` and `margin` stay inline since Tailwind 4 doesn't have `max-w-1320` directly (we use `max-w-[1320px]`).

- [ ] **Step 3: Add padding to the footer outer element**

The `<footer>` element has `padding: "60px 0 30px"`. This is fine — it's top/bottom only. No change needed.

- [ ] **Step 4: Verify visually — footer**

Navigate to any page (`http://localhost:3000/`) in DevTools iPhone 12 Pro, scroll to the bottom. Verify:
- Footer columns are stacked (Logo, Rentals, Help, Visit — one after another vertically)
- Logo and tagline are readable
- All link targets are tappable (min 44px height)
- No horizontal overflow

At 640px–768px (sm breakpoint): columns switch to a 2-column grid (Rentals + Help side by side, Logo full width, Visit full width or 2nd column).

At 1024px+: 4-column layout restored.

- [ ] **Step 5: Commit footer changes**

```bash
git add src/components/shared/layout/ShopFooter.tsx
git commit -m "fix: mobile-responsive footer with stacked single-column layout"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] QuotePage page header: responsive padding + font size — Task 1
- [x] QuotePage 2-column grid: stacked on mobile — Task 1
- [x] QuotePage sidebar: not sticky on mobile — Task 1
- [x] QuotePage cart line items: flex-on-mobile / grid-on-desktop — Task 2
- [x] Shop detail breadcrumbs: responsive padding — Task 3
- [x] Shop detail 2-column grid: stacked on mobile (item + tent config both fixed) — Task 3
- [x] Shop detail h1: responsive font size (item + tent config both fixed) — Task 3
- [x] 35-day strip: horizontal scroll on mobile — Task 3
- [x] ShopFooter 4-col grid: responsive stacked layout — Task 4
- [x] ShopFooter padding: mobile-appropriate — Task 4

**Placeholder scan:** No TBDs, no "implement later", all steps show complete replacement code.

**Type consistency:** No new types introduced. All class names and Tailwind patterns are consistent with the rest of the codebase (`grid-cols-[1.6fr_1fr]`, `px-4 md:px-8`, `clamp()`).

---

## Known Edge Cases to QA After Implementation

1. **QuotePage contact form on mobile:** `grid grid-cols-2` for the contact form fields (line 178) with `style={{ gridColumn: "span 2" }}` for full-width fields. On a 375px screen, 2 columns means each input is ~155px — narrow but workable for short fields (first/last name). If it feels too tight, drop to `grid-cols-1` on mobile: `grid grid-cols-1 sm:grid-cols-2`. This is a judgment call after visual QA.

2. **QuotePage date bar on mobile** (lines 118–129): the date bar has a `flex justify-between` layout with the date text on the left and a `DateRangeField` on the right. On mobile this may be cramped. If it wraps or overflows, change to `flex-col gap-3`.

3. **ThirtyDayStrip `-mx-4 px-4` bleed:** This trick only works if the ThirtyDayStrip's parent container has `overflow: hidden` or is exactly at 16px (1rem) padding. Since the parent section uses `px-4 md:px-8`, the `-mx-4 px-4` cancels out and the strip reaches screen edges. Verify the negative margin doesn't bleed outside the `<section>`.

4. **Footer `sm:grid-cols-2` split:** At 640–767px, the footer shows 2 columns. Logo+tagline will be in position 1 and Rentals in position 2. Help links go to row 2 col 1 and Visit goes to row 2 col 2. This is reasonable but visually check that the logo section doesn't look awkward next to Rentals.
