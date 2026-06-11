---
name: quoting-template-sync
description: Use when brainstorming or planning any new feature for boisepartyco. Adds a classification phase and dual-repo plan sections so generic improvements are mirrored to quoting-template.
---

# quoting-template Sync

## Overview

boisepartyco was forked from quoting-template at `/Users/trevorhecht/Developer/repos/nextjs/quoting-template`. Generic improvements made here belong in **both** repos. This skill adds two phases to the normal brainstorm → plan workflow.

## Phase 1 — Classify During Brainstorming

After the design is agreed on, sort every planned change into one of two buckets before writing the plan:

| Generic → both repos | boisepartyco-only |
|---|---|
| Schema fields any quoting app could use | Tent / inventory-specific fields |
| API logic not tied to boisepartyco domain | Public marketing pages |
| Shared UI patterns (order cards, date pickers) | Boise Party Co branding / copy |
| Utility functions (formatDateRange, etc.) | Inventory management views |
| Auth / role guards | boisepartyco-specific integrations |

**When in doubt, classify as generic.** A field like `depositAmount`, `guests`, or a new date display utility is not boisepartyco-specific — any quoting app could use it.

## Phase 2 — Dual-Repo Plan Sections

**Before writing the plan:** quickly check if quoting-template already has the generic part (`grep` the field/function name). If it does, note it as "already synced" and skip that item for the template. If it doesn't, include it.

When writing the implementation plan, **boisepartyco sections come first**, then the quoting-template mirror. The plan file itself lives in `boisepartyco/docs/superpowers/plans/`. Structure:

```
## boisepartyco  ← ALWAYS FIRST
- prisma/schema.prisma — add depositAmount Decimal? field
- src/models/order.ts — add depositAmount to OrderDetail + OrderSummary
- src/app/api/orders/[id]/route.ts — handle in PATCH, strip for employees
...

## quoting-template  ← REQUIRED for all generic items; omit if already present
- prisma/schema.prisma — add depositAmount Decimal? field
- src/models/order.ts — add depositAmount to OrderDetail + OrderSummary
- src/app/api/orders/[id]/route.ts — handle in PATCH, strip for employees
...
```

quoting-template root: `/Users/trevorhecht/Developer/repos/nextjs/quoting-template/`

## Rules

- **boisepartyco first** — it is the active project; template changes are applied in the same session, not later
- **Template changes must stay generic** — no boisepartyco-specific copy, no inventory logic, no branding
- **One migration per repo** — each project gets its own migration file with identical SQL
- **Types must match** — if `OrderDetail` or `OrderSummary` gains a new field in boisepartyco, quoting-template gets the identical field
- **Check before adding** — read quoting-template files before listing them as changes; don't duplicate what's already there

## Common Rationalizations to Reject

| Rationalization | Reality |
|---|---|
| "quoting-template doesn't have inventory, so this doesn't apply" | Non-inventory fields (dates, deposits, guests, utilities) are still generic |
| "I'll sync it later" | Later never happens — plan and implement both in the same session |
| "The template is frozen / READY TO FORK" | It receives all generic improvements — that's what keeps it current |
| "It's too small to bother" | Small changes are the easiest to sync; no excuse to skip |
| "This UI is boisepartyco-specific" | Ask: would any order-management app want this? If yes, it's generic |
