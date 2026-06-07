# Tent Parts Inline Qty Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the side sheet for tent parts with click-to-edit inline qty input directly in the table cell.

**Architecture:** The `Dashboard-InventoryView-TentsTab.tsx` component manages all inline edit state (`editingId`, `editQty`, `savingId`). Clicking the qty value switches that cell to an `<input>`. Blur or Enter saves; Escape cancels. The `TentPartSheet` file is deleted.

**Tech Stack:** React 19, Next.js App Router, Tailwind 4, Lucide icons, sonner toasts

---

### Task 1: Implement inline qty editing — replace sheet in TentsTab

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentsTab.tsx`
- Delete: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-TentPartSheet.tsx`

- [ ] **Step 1: Replace sheet state with inline-edit state**

Open `Dashboard-InventoryView-TentsTab.tsx`. Replace:

```tsx
const [selectedPart, setSelectedPart] = useState<AdminTentPartSummary | null>(null)
const [partSheetOpen, setPartSheetOpen] = useState(false)
```

With:

```tsx
const [editingId, setEditingId] = useState<number | null>(null)
const [editQty, setEditQty] = useState("")
const [savingId, setSavingId] = useState<number | null>(null)
```

- [ ] **Step 2: Replace handlePartClick and handlePartSaved with inline handlers**

Remove `handlePartClick` entirely. Replace `handlePartSaved` with:

```tsx
function handleQtyClick(part: AdminTentPartSummary) {
  if (savingId === part.id) return
  setEditingId(part.id)
  setEditQty(part.qty !== null ? String(part.qty) : "")
}

async function handleQtySave(part: AdminTentPartSummary) {
  const parsed = parseInt(editQty, 10)
  if (isNaN(parsed) || parsed < 0) {
    toast.error("Qty must be a non-negative whole number.")
    setEditingId(null)
    return
  }
  setEditingId(null)
  setSavingId(part.id)
  const res = await fetch(`/api/admin/inventory/tent-parts/${part.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty: parsed }),
  })
  const json = await res.json()
  setSavingId(null)
  if (json.error) { toast.error(json.error); return }
  setParts(prev => prev.map(p => p.id === json.data.id ? json.data : p))
  const configsRes = await fetch("/api/admin/inventory/tent-configurations")
  const { data } = await configsRes.json()
  if (data) setConfigs(data)
  toast.success("Saved")
}
```

- [ ] **Step 3: Update imports — remove TentPartSheet, add Loader2**

At the top of the file:
- Remove: `import DashboardInventoryViewTentPartSheet from "./Dashboard-InventoryView-TentPartSheet"`
- Add: `import { Loader2 } from "lucide-react"`
- Keep all other imports as-is.

- [ ] **Step 4: Update the tent parts table row**

Replace the `<tr>` for parts:

```tsx
// Before
<tr
  key={part.id}
  className={[
    "border-b border-(--color-border) last:border-0 cursor-pointer transition-colors hover:bg-(--color-surface)",
    selectedPart?.id === part.id && partSheetOpen ? "bg-(--color-surface)" : "",
  ].join(" ")}
  onClick={() => handlePartClick(part)}
>
```

With:

```tsx
// After
<tr
  key={part.id}
  className="border-b border-(--color-border) last:border-0 transition-colors hover:bg-(--color-surface)"
>
```

- [ ] **Step 5: Replace the Qty Owned cell with click-to-edit**

Replace:

```tsx
<td className="px-4 py-3 text-center font-semibold text-(--color-foreground)">
  {part.qty !== null ? part.qty : <span className="text-(--color-muted)">—</span>}
</td>
```

With:

```tsx
<td
  className="px-4 py-3 text-center font-semibold text-(--color-foreground)"
  onClick={() => editingId !== part.id && handleQtyClick(part)}
>
  {savingId === part.id ? (
    <Loader2 className="h-4 w-4 animate-spin mx-auto text-(--color-muted)" />
  ) : editingId === part.id ? (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={editQty}
      autoFocus
      onChange={e => setEditQty(e.target.value)}
      onBlur={() => handleQtySave(part)}
      onKeyDown={e => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") setEditingId(null)
      }}
      className="w-16 text-center text-sm font-semibold border border-(--color-border) rounded px-2 py-1 bg-(--color-background) focus:outline-none focus:ring-1 focus:ring-(--color-primary)"
    />
  ) : (
    <span className="cursor-text hover:text-(--color-primary) transition-colors">
      {part.qty !== null ? part.qty : <span className="text-(--color-muted) font-normal">—</span>}
    </span>
  )}
</td>
```

- [ ] **Step 6: Remove the TentPartSheet usage from JSX**

Find and delete this block near the bottom of the return:

```tsx
{isAdmin ? (
  <DashboardInventoryViewTentPartSheet
    part={selectedPart}
    open={partSheetOpen}
    onOpenChange={setPartSheetOpen}
    onSaved={handlePartSaved}
  />
) : null}
```

- [ ] **Step 7: Delete the TentPartSheet file**

```bash
rm src/app/\(app\)/dashboard/components/views/inventory/Dashboard-InventoryView-TentPartSheet.tsx
```

- [ ] **Step 8: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors appear in touched files, fix them before proceeding.

- [ ] **Step 9: Verify in browser**

Run `npm run dev`, navigate to Dashboard → Inventory → Tents → Tent Parts tab.
- Hovering a qty value should show it highlighted (blue text)
- Clicking it should switch to an input, focused, with current value
- Pressing Enter or clicking away should save (toast "Saved") and update the value
- Pressing Escape should revert to the original value without saving
- While saving, a spinner should appear in the cell
- The Configurations tab's "Can Build" and bottleneck data should update after a qty change
