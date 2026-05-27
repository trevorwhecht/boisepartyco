# Single Calendar & Cart Conflict Design

**Date:** 2026-05-26  
**Status:** Approved

## Problem

Two bugs in the current UX:

1. The home hero renders its own `DateRangeField`, creating a second independent calendar popup. Both the nav and hero calendars can be open simultaneously, which is confusing and broken-feeling.
2. When a user changes their event dates after adding items to their cart, no check is performed — cart items that are no longer available for the new dates remain silently in the quote.

## Scope

- Fix duplicate calendar: hero opens the nav's calendar instead of its own
- Date-change conflict check: warn user and remove unavailable items before applying new dates
- Nothing else (no add-to-cart gate, no tent stock without dates, no other changes)

---

## Design

### 1. DatePickerContext

**File:** `src/contexts/DatePickerContext.tsx` (new)

A minimal React context with three values:

```ts
type DatePickerContextValue = {
  isOpen: boolean
  openPicker: () => void
  closePicker: () => void
}
```

`DatePickerProvider` wraps the public layout alongside the existing `CartProvider` in `src/app/(public)/layout.tsx`. Any component that needs to open the nav calendar calls `useDatePicker().openPicker()`.

No message prop, no extra state — just open/close.

---

### 2. DateRangeField — Controlled Mode

**File:** `src/components/shared/DateRangeField.tsx` (modify)

Add two optional props:

```ts
externalOpen?: boolean
onExternalChange?: (open: boolean) => void
```

When both are provided, the component is in **controlled mode**: it uses `externalOpen` instead of its own `open` state, and calls `onExternalChange` instead of `setOpen`. When neither is provided, behaviour is identical to today — fully self-contained.

The nav's two `DateRangeField` instances (desktop and mobile rows in `ShopHeader`) pass these props wired to the context:

```tsx
<DateRangeField
  ...
  externalOpen={isOpen}
  onExternalChange={(o) => o ? openPicker() : closePicker()}
/>
```

---

### 3. Home-Hero — Button Replaces DateRangeField

**File:** `src/app/(public)/Home-Hero.tsx` (modify)

Remove both `DateRangeField` instances (dark mobile + regular desktop). Replace each with a plain styled `<button>` that:

- Reads `from`/`to` from the URL to display the current date label (same logic as before)
- Calls `useDatePicker().openPicker()` on click
- Matches the existing visual style of the old `DateRangeField` button

`useRouter` and `handleChange` are removed from the hero — date changes are handled exclusively by `ShopHeader`.

---

### 4. ShopHeader — Async Conflict Check

**File:** `src/components/shared/layout/ShopHeader.tsx` (modify)  
**File:** `src/components/shared/layout/ShopHeader-ConflictDialog.tsx` (new)

`handleDateChange` becomes `async`. New logic for when a **complete date range** is selected:

| Condition | Behaviour |
|---|---|
| Only start date picked (no end) | Apply to URL immediately, no check |
| Cart is empty | Apply to URL immediately, no check |
| Cart has items | Hit `/api/inventory/availability`, check each line |
| All items available | Apply dates silently |
| Some items unavailable | Show conflict dialog (see below) |

**Availability check:** `GET /api/inventory/availability?itemIds=1,2&configIds=3&from=YYYY-MM-DD&to=YYYY-MM-DD` — already exists, no changes needed.

**Conflict dialog (`ShopHeader-ConflictDialog.tsx`):**

- shadcn `AlertDialog`
- Title: "Some items aren't available for these dates"
- Body: list of conflicting items — each row shows item name, qty in cart, qty available for the new dates
- Cancel button: "Keep current dates" — closes dialog, dates unchanged, cart unchanged
- Confirm button (autoFocus): "Remove items & continue" — removes conflicting lines from cart via `removeLine`, then applies new dates

ShopHeader holds two new state values: `pendingDates` (the not-yet-applied date range) and `conflicts` (the list of conflicting cart lines with their available counts). Both reset to null/empty on cancel or after confirm.

On fetch error (network failure): apply dates anyway — the server re-validates on order submit.

---

## Files Changed

| File | Action |
|---|---|
| `src/contexts/DatePickerContext.tsx` | Create |
| `src/app/(public)/layout.tsx` | Modify — mount `DatePickerProvider` |
| `src/components/shared/DateRangeField.tsx` | Modify — add controlled mode props |
| `src/components/shared/layout/ShopHeader.tsx` | Modify — wire context + async conflict check |
| `src/components/shared/layout/ShopHeader-ConflictDialog.tsx` | Create |
| `src/app/(public)/Home-Hero.tsx` | Modify — replace `DateRangeField` with context button |

**6 files. No new API routes. No schema changes. No new dependencies.**
