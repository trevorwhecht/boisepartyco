# Quote Checkout — Auth-Aware Contact Step

**Date:** 2026-06-07
**Branch:** finishQuoteBuild
**Status:** Approved — ready for implementation

---

## Overview

The quote checkout contact step (`/quote` → step 2) currently has zero auth awareness — it's fully public with a static form. This spec adds three distinct flows based on the session state: anonymous users, logged-in regular users, and admin/employee users making quotes on behalf of customers.

---

## User Flows

### Flow 1: Anonymous (not logged in)

1. A "Sign in to auto-fill" pill sits above the form. Clicking it opens the existing `NavbarAccountPanel` dropdown (via `AccountPanelContext`). After sign-in the page re-renders into Flow 2.
2. Contact form fields: firstName, lastName, phone, email, venue, notes — unchanged from today.
3. Consent section below the form (see Consent Section). **"Create account" is one of the three consent toggles** — there is no separate checkbox. Selecting it slides in a password field directly below the consent section. The submit button label changes to "Create & send →".
4. **On submit without "Create account" selected:** server upserts a guest record by email (existing behavior). Order is linked to that guest user.
5. **On submit with "Create account" selected:** client calls `POST /api/users` to create the account, then `signIn("credentials", { email, password, redirect: false })`, then submits the order. The server's existing email upsert finds the just-created account and links the order correctly — no API change required for this path.

### Flow 2: Logged-in regular user (`role === 'user'`)

1. No "Sign in" prompt shown.
2. Form fields pre-fill from session: name, email, phone. All fields remain editable.
3. Consent section shown (they still choose how to receive updates).
4. Submit behaves identically to anonymous — server upserts by email, finds their existing account, links order.

### Flow 3: Admin or employee (`role === 'admin' | 'employee'`)

1. A combobox sits above the form, defaulting to **"New guest / customer"** with the entry form fields visible below.
2. Admin/employee can type to search and switch to any existing user. Selecting a user collapses the form and shows a name + email chip. Switching back to "New guest / customer" restores the empty form.
3. **No consent section shown** — admin/employee are entering the customer's info; opt-in consent must come from the customer directly.
4. **On submit with existing user selected:** `userId` is passed in the request body. `handlePublicShopQuote` skips the guest upsert and connects the order directly to that user.
5. **On submit with new guest:** same guest upsert path as Flow 1, no `userId` in payload.

---

## Consent Section

Shown for **Flow 1 and Flow 2 only**. At least one option must be selected to enable the submit button.

### Options (multi-select, independent toggles)
- **Text** — consent to receive SMS quote and order updates
- **Email** — consent to receive email quote confirmation and updates
- **Create account** — save info and track orders. Selecting this reveals a password field below the consent section. This is the single control for account creation — no separate checkbox exists.

### Responsive layout
- **Desktop:** Horizontal pill toggle buttons. Selected = blue fill + border. Unselected = grey border, white background.
- **Mobile:** Vertical toggle rows — label + icon on the left, iOS-style on/off toggle switch on the right.

### SMS disclosure
Appears only when **Text** is toggled on. Renders as a single small muted line directly below the consent section:

> *Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help. [Privacy Policy]*

### Compliance
- The SMS toggle is **never pre-checked**.
- "Create account" is always a valid third path — no user is ever forced to consent to SMS or email. This satisfies TCPA's prohibition on conditioning service on marketing consent.
- Email consent for transactional messages (quote confirmations, order updates) does not require prior opt-in under CAN-SPAM, but the checkbox is shown for best practice and A2P 10DLC campaign evidence.

---

## Component Architecture

### New files

| File | Purpose |
|---|---|
| `src/app/(public)/quote/components/QuotePage-ContactStep.tsx` | Contains the full contact step UI. Receives `session`, `contact` state, callbacks, and renders the correct flow based on role. |
| `src/app/(public)/quote/components/QuotePage-AdminCustomerSelect.tsx` | Combobox for admin/employee customer selection. Defaults to "New guest / customer", searches all users, emits selected `userId` or `null`. |
| `src/app/(public)/quote/components/QuotePage-ConsentToggles.tsx` | Responsive consent section. Pill toggles on desktop, toggle rows on mobile. Accepts `value: { sms: boolean, email: boolean, account: boolean }` and `onChange`. |
| `src/contexts/AccountPanelContext.tsx` | Provides `openPanel()` and `isOpen` so any component can open the navbar account dropdown. |

### Modified files

| File | Change |
|---|---|
| `src/app/(public)/quote/QuotePage.tsx` | Add `useSession()`. Pass session to `QuotePage-ContactStep`. Thread admin flow and `userId` state. |
| `src/components/shared/layout/ShopHeader.tsx` | Provide `AccountPanelContext`. Move `accountOpen` state into the context. |
| `src/app/api/orders/route.ts` | `handlePublicShopQuote`: accept optional `userId` in body. If present, skip the guest upsert and `connect` order directly to that user. |
| `src/app/api/users/route.ts` | No changes needed — `POST /api/users` is already a public endpoint that accepts email, password, firstName, lastName, phone. |

### New API endpoint

| Endpoint | Purpose |
|---|---|
| `GET /api/users/search?q=` | Returns matching users (id, firstName, lastName, email) for the admin combobox. Requires admin or employee session. Returns max 20 results. |

---

## Data Flow on Submit

```
Anonymous, no account     →  POST /api/orders { pickupDate, customer, lines }
                              Server: upsert guest by email → create order → notify admins

Anonymous, with account   →  POST /api/users { firstName, lastName, email, phone, password }
                              signIn("credentials", { email, password })
                              POST /api/orders { pickupDate, customer, lines }
                              Server: upsert by email finds new account → create order

Logged-in user            →  POST /api/orders { pickupDate, customer, lines }
                              Server: upsert by email finds existing account → create order

Admin/employee, new guest →  POST /api/orders { pickupDate, customer, lines }
                              Server: guest upsert → create order

Admin/employee, existing  →  POST /api/orders { pickupDate, customer, lines, userId }
                              Server: skip upsert, connect { id: userId } → create order
```

---

## Consent Data Storage

The `consentSms` and `consentEmail` booleans selected on the form should be stored on the order or user record so the system knows which channels are authorized for follow-up communications.

**Decision:** Store on the `Order` model as `consentSms: Boolean @default(false)` and `consentEmail: Boolean @default(false)`. This keeps consent scoped to the specific transaction (a user may opt in for one order and not another). Schema change required — add migration.

---

## Out of Scope

- Forgot password flow (existing TODO in `Navbar-AccountPanel.tsx`)
- Unsubscribe management UI
- Admin viewing/editing consent flags per order
- Sending the actual confirmation SMS/email to the customer (this spec covers consent collection only; the notification send logic is a follow-on task)
