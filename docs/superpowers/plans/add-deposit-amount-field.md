# Feature Plan: Add Deposit Amount Field to Orders

**Feature:** Record and display deposit amounts on orders — admin records the amount collected, customers see it on their order page.

**Context:**
- The system already tracks payment plans (`paymentPlan` field: "full_up_front", "deposit_XX", "pay_at_pickup")
- Deposit % is encoded in the plan string (e.g., "deposit_50" = 50% deposit required)
- Current flow: admin moves order through states, can record payments in the Payment table
- Customers view orders at `/orders/[token]` (public) and see payment info
- Admin dashboard shows orders and can record payments

---

## Brainstorm

### Key Questions
1. **Should `depositAmount` store the actual dollar amount collected, or just replicate `paymentPlan`?**
   - Decision: Store the actual amount. This allows:
     - Admin to override what was actually collected (e.g., plan says 50% but customer paid a different amount)
     - A source of truth separate from paymentPlan logic
     - Customers see "You've paid $X toward the deposit"

2. **Who can edit it?**
   - Admin only — employees should not see cost/profit fields (per CLAUDE.md), deposit might be considered financial

3. **Should it sync with the Payment table?**
   - No direct sync — the Payment table records individual payment transactions
   - `depositAmount` is a summary field: "how much of the deposit has been collected"
   - This is separate from `isPaid` (full order paid) and `payments` (transaction history)

4. **Where is it used?**
   - Admin dashboard: display in order detail, editable field
   - Customer order page: show as "Deposit Collected: $X"
   - Order API: return in OrderDetail shape for dashboard/display

### Current Payment Architecture
- **Payment table:** records each transaction (amount, channel, date, who recorded it)
- **Order fields:** `isPaid` (bool), `paymentPlan` (string with %-encoded deposit), `finalPrice` (optional override)
- **orderService:** strips cost/profit from employee view via `stripAdminFields`

### Proposed Design
1. Add `depositAmount` field to Order schema (Decimal, nullable)
2. Strip it from employee view (group with cost/profit as admin-only)
3. Add UI to admin dashboard order detail to edit it
4. Show it on customer order page (`/orders/[token]`)
5. Include in API responses (OrderDetail, OrderSummary types)

---

## Implementation Plan

### Phase 1: Schema & API

#### 1.1 — Database Schema
**File:** `prisma/schema.prisma`
- Add `depositAmount` field to `Order` model: `Decimal? @db.Decimal(10, 2)`
- Non-nullable but can be null (optional field)

**Prisma Migration:**
- Run `npx prisma migrate dev --name add_order_deposit_amount` (user will do this)
- Updates schema and creates migration file

---

### Phase 2: Data Models

#### 2.1 — Update TypeScript Models
**File:** `src/models/order.ts`
- Add `depositAmount: number | null` to `OrderSummary` type
- Add `depositAmount: number | null` to `OrderDetail` type
- Update JSDoc comments if any

---

### Phase 3: API Layer

#### 3.1 — Update Order GET Route
**File:** `src/app/api/orders/[id]/route.ts`
- Order detail include already includes all scalar fields
- No changes needed (depositAmount will be auto-included in query)
- Ensure `stripAdminFields()` removes depositAmount for employees

#### 3.2 — Update Order PATCH Route
**File:** `src/app/api/orders/[id]/route.ts`
- Add `depositAmount` to the destructured body fields
- Add to `scalarUpdate` only if `role === "admin"`
- Validate: if provided, must be `>= 0` and `<= order.totalPrice` (optional validation)

#### 3.3 — Update Order List Route
**File:** `src/app/api/orders/route.ts`
- Query already returns OrderSummary shape
- If `depositAmount` is included in the list query, verify it's stripped for employees via existing `stripAdminFields()` call

#### 3.4 — Update Order Service
**File:** `src/services/orderService.ts`
- Update `stripAdminFields()` to remove `depositAmount` from employee view
- Add to the list of admin-only fields (alongside `cost`, `profit`, `discountManual`, etc.)
- Update `serializeOrder()` if it transforms Decimal to number — no special logic needed, standard decimal handling

---

### Phase 4: Admin UI (Dashboard)

#### 4.1 — Order Detail Dialog
**File:** `src/app/(app)/dashboard/components/order-detail/Dashboard-OrderDetailDialog.tsx`
- Add a read-only or editable field for `depositAmount` in the order detail display
- Placement: in the "Totals" or "Payment" section, after existing payment info
- Make it editable (text input) for admins
- Save via the existing `patchOrder()` function (already handles PATCH requests)
- Format: `$X.XX` display, number input for editing

**Implementation:**
- Add input field near payment info section
- Wrap in conditional: only show if `isAdmin`
- Use the existing Input component from shadcn
- Format on display: `Number(order.depositAmount ?? 0).toFixed(2)`
- On change: call `patchOrder({ depositAmount: parseFloat(value) })`

#### 4.2 — Order Card / Kanban View
**File:** `src/app/(app)/dashboard/components/kanban/Dashboard-OrderCard.tsx`
- Optional: display deposit amount as a badge or small text
- Consider: "Deposit: $X / $Y" format
- Only for admin view

---

### Phase 5: Customer UI

#### 5.1 — Public Order Page
**File:** `src/app/(app)/orders/[token]/page.tsx`
- Query now needs to include `depositAmount` in select
- Add a section in the "Totals" area showing deposit info
- Display: "Deposit Collected: $X" (if depositAmount is set and > 0)
- No edit capability for customers

**Placement in page:**
- After the main totals section (after Subtotal, Tax, Total)
- Or inline in the totals table as another row

**Display logic:**
- If depositAmount is null: don't show anything
- If depositAmount is 0: don't show (or show "No deposit recorded")
- If depositAmount > 0: show "Deposit Collected: $X.XX"
- Optional: show remaining due = totalPrice - depositAmount

---

### Phase 6: Type Updates

#### 6.1 — Update OrderDetail Select Query
- In route handlers and pages that query with `select`, ensure `depositAmount` is included
- Check files:
  - `src/app/(app)/orders/[token]/page.tsx` — add to select
  - `src/app/api/orders/[id]/route.ts` — already uses ORDER_DETAIL_INCLUDE (covers all scalar fields)

---

## Files to Modify (In Order)

1. **Schema & Migrations** (requires user approval)
   - `prisma/schema.prisma` — add `depositAmount` field
   - `prisma/migrations/[timestamp]_add_order_deposit_amount/migration.sql` — auto-generated

2. **Type Definitions**
   - `src/models/order.ts` — add `depositAmount` to OrderDetail and OrderSummary

3. **API Routes**
   - `src/app/api/orders/[id]/route.ts` — handle depositAmount in PATCH, strip for employees
   - `src/app/api/orders/route.ts` — verify list endpoint strips for employees

4. **Services**
   - `src/services/orderService.ts` — update `stripAdminFields()` to remove depositAmount for non-admins

5. **Admin UI**
   - `src/app/(app)/dashboard/components/order-detail/Dashboard-OrderDetailDialog.tsx` — add deposit field input + display
   - `src/app/(app)/dashboard/components/kanban/Dashboard-OrderCard.tsx` — optional badge/display

6. **Customer UI**
   - `src/app/(app)/orders/[token]/page.tsx` — add depositAmount to select, display in totals section

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Admin creates/edits order, sets depositAmount — verify saves to DB
- [ ] Admin views order detail, sees depositAmount field, can edit it
- [ ] Employee views order detail, does NOT see depositAmount
- [ ] Customer views order page, sees "Deposit Collected: $X" if set
- [ ] Customer views order page, sees nothing if depositAmount is null
- [ ] Kanban view (if added) displays deposit correctly for admin
- [ ] Payment flow unaffected — deposits and payments are independent

### API Testing
- GET `/api/orders/:id` as admin — returns depositAmount
- GET `/api/orders/:id` as employee — does NOT return depositAmount
- PATCH `/api/orders/:id` with `depositAmount: 500` as admin — updates successfully
- PATCH as employee with depositAmount — silently ignored (not in allowed fields)

---

## Edge Cases & Notes

### Optional Enhancements (not in Phase 1)
- Validation: ensure depositAmount <= totalPrice (warning, not hard block)
- Auto-calculate from payments table: "Deposit collected = sum of payments before final payment"
- Payment plan sync: auto-set depositAmount when moving to state 3 based on paymentPlan %

### Relationship to Existing Fields
- `isPaid` (bool) — separate, means full order is paid
- `paymentPlan` (string) — defines the expected deposit %, independent of actual collected amount
- `payments` (Payment[]) — transaction history, independent
- `finalPrice` (Decimal?) — optional override of totalPrice, unrelated

### Notes for Future Refinement
- Consider adding `depositAmountDue` (computed from paymentPlan %) vs `depositAmountCollected` (actual)
- Could add deposit-related notifications: "Deposit due in 7 days" etc.
- Payment flow could validate: can't mark paid if depositAmount is still below expected amount

---

## Summary

**Scope:** Add a single `depositAmount` field to Order, expose it in admin UI and customer views, strip from employee access.

**Risk Level:** Low — new optional field, no changes to existing payment/state logic.

**Effort:** ~2–3 hours — straightforward field addition, UI components already exist.
