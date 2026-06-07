---
name: feedback-no-modal-for-single-field
description: Never open a modal, sheet, or side panel just to edit a single field — use inline editing instead
metadata:
  type: feedback
---

Never create a modal, sheet, or side panel whose sole purpose is editing one field. Use inline editing directly in the table/list row instead.

**Why:** User explicitly called this out when the TentPart sheet was only editing qty. Opening a full panel for one input is unnecessary friction.

**How to apply:** Before building any sheet/modal for editing, count the editable fields. If it's just one, make it inline with a per-row save button.
