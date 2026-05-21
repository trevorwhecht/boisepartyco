# Contact Form — Design Spec
**Date:** 2026-05-20  
**Status:** Approved

## Overview

Upgrade the contact page form to capture full event inquiry details and deliver a formatted SMS to the admin via the existing Twilio integration.

## Form Fields & Validation

Fields rendered inside `Contact-Form.tsx` (in order):

| Field | Type | Required |
|---|---|---|
| Name | text | Always |
| Email | email | Always |
| Phone | tel | Always |
| Date Confirmed | checkbox | — |
| Event Date | date | Only when Date Confirmed is checked |
| Event Address | text | Always |
| Message | textarea | Only when Date Confirmed is **not** checked |

### Conditional Logic

- **Date Confirmed unchecked (default):** Event Date field is hidden. Message is required.
- **Date Confirmed checked:** Event Date field appears and is required. Message becomes optional.

### Error Handling (client-side)

- Inline errors below each invalid field with `role="alert"`
- Focus is moved to the first invalid field on failed submit
- Submit button shows `Loader2` spinner and is disabled while `useTransition` is pending
- Server errors surface as a toast

## Architecture

### Component: `Contact-Form.tsx`

**Location:** `src/app/(public)/contact/components/Contact-Form.tsx`

- `"use client"` — owns all form state
- Uses `useTransition` for the pending/spinner state
- Validates all fields before submitting; sets inline field errors on failure
- On success: clears form and shows a success message in place of the submit button area
- POSTs to `/api/contact`

### Page: `page.tsx`

**Location:** `src/app/(public)/contact/page.tsx`

- Stays a thin layout shell — left column (address/map), right column (`<ContactForm />`)
- No logic, no `"use client"`

### API Route: `POST /api/contact`

**Location:** `src/app/api/contact/route.ts`

- Public — no auth required
- Server-side validates all required fields (same rules as client)
- Reads `NotificationSettings` (id: 1) from DB to get `smsEnabled` and `smsPhone`
- If `smsEnabled && smsPhone` → calls `sendSms()` from `twilioService`
- If SMS is disabled or unconfigured → returns success silently (consistent with rest of app)
- Returns `{ data, error }` tuple

### SMS Format

```
📋 New Contact Form
Name: Sarah Johnson
Email: sarah@example.com
Phone: (208) 555-4321
Event Date: Jun 15 2026 ✓ Confirmed
Event Address: 123 Maple St, Boise ID
Message: Looking for a tent and tables for a backyard party
```

When date not confirmed:
```
📋 New Contact Form
Name: Sarah Johnson
Email: sarah@example.com
Phone: (208) 555-4321
Event Date: Not confirmed
Event Address: 123 Maple St, Boise ID
Message: Planning a party for next summer, not sure on dates yet
```

Message line is omitted from the SMS entirely if Date Confirmed is checked and message is blank.

## Files

| Action | Path |
|---|---|
| Create | `src/app/(public)/contact/components/Contact-Form.tsx` |
| Modify | `src/app/(public)/contact/page.tsx` |
| Create | `src/app/api/contact/route.ts` |

## Out of Scope

- Storing contact submissions in the database (can be added later)
- Email notifications (Twilio SMS only for now)
- Admin UI for viewing past inquiries
