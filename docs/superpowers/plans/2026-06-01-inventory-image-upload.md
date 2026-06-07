# Inventory Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Primary Image URL" text input in the Edit Item sheet with a drag-and-drop / file-browse upload component that stores images on Cloudinary and saves the returned URL to the item.

**Architecture:** Read a user-selected file with `FileReader` in the browser, send the base64 data URL to a new `/api/upload-image` route (admin/employee-only), upload to Cloudinary via the SDK on the server, and return the `secure_url` to the client. A new `Dashboard-InventoryView-ImageUpload` component owns the drag-and-drop UI and upload pending state; the ItemSheet just holds the resulting URL in its existing `imageUrl` state. No schema changes — `Item.primaryImageUrl` already exists.

**Tech Stack:** Next.js App Router · `cloudinary` npm package (already installed at ^2.10.0) · `FileReader` API · Tailwind 4 · shadcn/ui · Lucide icons

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/cloudinaryUpload.ts` | **Create** | Server-side: parse base64 data URL, stream upload to Cloudinary, return `secure_url` |
| `src/app/api/upload-image/route.ts` | **Create** | Auth-protected POST endpoint — accepts `{ dataUrl, folder?, publicId? }`, returns `{ url }` |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ImageUpload.tsx` | **Create** | Client component: drag-and-drop zone, file browser, upload progress, image preview with clear/replace |
| `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx` | **Modify** | Replace the `Primary Image URL` `<Input>` (lines 141–151) with `<DashboardInventoryViewImageUpload>` |

> `CLOUDINARY_URL` is already in `.env.example` (line 8). The `cloudinary` package is already installed. The implementer only needs to confirm the env var is set in `.env.local`.

---

## Task 1: Confirm environment and create the Cloudinary upload utility

**Files:**
- Create: `src/utils/cloudinaryUpload.ts`

- [ ] **Step 1: Confirm CLOUDINARY_URL is set in .env.local**

Open `.env.local` and verify `CLOUDINARY_URL` has a value in the format:
```
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

Get this value from your Cloudinary dashboard → Settings → API Keys. If it's missing, add it now — the upload route will return 500 without it.

- [ ] **Step 2: Create src/utils/cloudinaryUpload.ts**

```ts
function parseBase64DataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const lower = dataUrl.toLowerCase()
  const marker = ";base64,"
  const markerIdx = lower.indexOf(marker)
  if (markerIdx === -1 || !lower.startsWith("data:")) throw new Error("Invalid data URL format")
  const mimeType = dataUrl.slice("data:".length, markerIdx).trim()
  const base64Data = dataUrl.slice(markerIdx + marker.length)
  if (!mimeType.length || !base64Data.length) throw new Error("Invalid data URL format")
  return { mimeType, base64Data }
}

let cloudinaryV2: typeof import("cloudinary").v2 | null = null

async function getCloudinaryV2() {
  if (!cloudinaryV2) cloudinaryV2 = (await import("cloudinary")).v2
  return cloudinaryV2
}

export async function uploadBase64ToCloudinary(
  dataUrl: string,
  folder = "inventory-items",
  publicId?: string,
): Promise<string> {
  if (!process.env.CLOUDINARY_URL) throw new Error("CLOUDINARY_URL not configured")
  if (!dataUrl.startsWith("data:")) return dataUrl

  const { mimeType, base64Data } = parseBase64DataUrl(dataUrl)
  const buffer = Buffer.from(base64Data, "base64")
  const cloudinary = await getCloudinaryV2()

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        format: mimeType === "image/png" ? "png" : undefined,
        transformation: [{ quality: "auto:best" }],
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result!.secure_url)
      },
    )
    stream.end(buffer)
  })
}
```

- [ ] **Step 3: Run type check — should show zero new errors**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep -v ".next/types"
```

Expected: no output (zero errors in source files).

---

## Task 2: Create the upload API route

**Files:**
- Create: `src/app/api/upload-image/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadBase64ToCloudinary } from "@/utils/cloudinaryUpload"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { dataUrl, folder, publicId } = body

  if (!dataUrl || typeof dataUrl !== "string") {
    return NextResponse.json({ error: "dataUrl is required" }, { status: 400 })
  }

  if (!dataUrl.startsWith("data:")) {
    return NextResponse.json({ url: dataUrl })
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 })
  }

  try {
    const url = await uploadBase64ToCloudinary(dataUrl, folder ?? "inventory-items", publicId)
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[upload-image]", err)
    const details = err?.message ?? "Upload failed"
    return NextResponse.json({ error: "Upload failed", details }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep -v ".next/types"
```

Expected: no output.

---

## Task 3: Create the ImageUpload component

**Files:**
- Create: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ImageUpload.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

export default function DashboardInventoryViewImageUpload({ value, onChange, disabled }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP, etc.)")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB")
      return
    }

    startTransition(async () => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          folder: "inventory-items",
          publicId: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.details ?? json.error ?? "Upload failed")
        return
      }
      onChange(json.url)
      toast.success("Image uploaded")
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ""
  }

  const isDisabled = disabled || isPending

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-md overflow-hidden border border-(--color-border) bg-(--color-surface)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Item image" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={isDisabled}
            className="absolute top-2 right-2 rounded-full bg-(--color-background) border border-(--color-border) p-1 text-(--color-muted) hover:text-(--color-danger) transition-colors disabled:opacity-50"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => !isDisabled && inputRef.current?.click()}
          disabled={isDisabled}
          className="text-xs text-(--color-muted) hover:text-(--color-foreground) underline transition-colors disabled:opacity-50"
        >
          Replace image
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} disabled={isDisabled} />
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !isDisabled && inputRef.current?.click()}
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed h-36 transition-colors",
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        isDragOver
          ? "border-(--color-primary) bg-(--color-primary)/5"
          : "border-(--color-border) bg-(--color-surface) hover:border-(--color-primary)/50",
      ].join(" ")}
    >
      {isPending ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-(--color-muted)" />
          <span className="text-xs text-(--color-muted)">Uploading…</span>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-(--color-muted)" />
          <span className="text-xs text-(--color-muted) text-center px-4">
            Drag and drop an image, or click to browse
          </span>
          <span className="text-xs text-(--color-muted)">JPG, PNG, WebP · max 10 MB</span>
        </>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} disabled={isDisabled} />
    </div>
  )
}
```

- [ ] **Step 2: Run type check**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep -v ".next/types"
```

Expected: no output.

---

## Task 4: Update ItemSheet to use the ImageUpload component

**Files:**
- Modify: `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import type { AdminItemSummary, PricingMode } from "@/models/inventory"
import DashboardInventoryViewImageUpload from "./Dashboard-InventoryView-ImageUpload"

type Props = {
  item: AdminItemSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: AdminItemSummary) => void
}

export default function DashboardInventoryViewItemSheet({ item, open, onOpenChange, onSaved }: Props) {
  const [qty, setQty] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [flatPrice, setFlatPrice] = useState("")
  const [pricingMode, setPricingMode] = useState<PricingMode>("per_day")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (item) {
      setQty(item.qty !== null ? String(item.qty) : "")
      setIsActive(item.isActive)
      setImageUrl(item.primaryImageUrl ?? null)
      setFlatPrice(String(item.flatPrice))
      setPricingMode(item.pricingMode)
    }
  }, [item])

  function handleSave() {
    if (!item) return

    const parsedQty = parseInt(qty, 10)
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error("Qty must be a non-negative whole number.")
      return
    }

    const parsedPrice = parseFloat(flatPrice)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Price must be a non-negative number (use 0 for 'call for pricing').")
      return
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/inventory/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: parsedQty,
          isActive,
          primaryImageUrl: imageUrl || null,
          flatPrice: parsedPrice,
          pricingMode,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        return
      }
      onSaved(json.data)
      toast.success("Saved")
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm bg-(--color-background) flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-(--color-foreground)">Edit Item</SheetTitle>
        </SheetHeader>

        {item ? (
          <div className="flex-1 space-y-4 mt-4 px-1 overflow-y-auto">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Name</Label>
              <p className="text-sm text-(--color-foreground) rounded-md bg-(--color-surface) px-3 py-2">{item.name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">SKU</Label>
              <p className="text-sm font-mono text-(--color-muted) rounded-md bg-(--color-surface) px-3 py-2">{item.sku}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-qty" className="text-xs uppercase tracking-wide text-(--color-muted)">Qty Owned</Label>
              <Input
                id="inv-item-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Physical units in your possession</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-price" className="text-xs uppercase tracking-wide text-(--color-muted)">Rental Price ($)</Label>
              <Input
                id="inv-item-price"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                value={flatPrice}
                onChange={e => setFlatPrice(e.target.value)}
                className="text-base font-semibold"
              />
              <p className="text-xs text-(--color-muted)">Set to 0 for "call for pricing"</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-item-pricing-mode" className="text-xs uppercase tracking-wide text-(--color-muted)">Pricing Mode</Label>
              <select
                id="inv-item-pricing-mode"
                value={pricingMode}
                onChange={e => setPricingMode(e.target.value as PricingMode)}
                className="w-full h-10 rounded-md border border-(--color-border) bg-(--color-background) px-3 text-base text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary)/50"
              >
                <option value="per_day">Per Day</option>
                <option value="per_foot">Per Foot</option>
                <option value="per_event">Per Event</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-(--color-surface) px-3 py-3">
              <Label htmlFor="inv-item-active" className="text-sm text-(--color-foreground) cursor-pointer">Active</Label>
              <Switch
                id="inv-item-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wide text-(--color-muted)">Product Image</Label>
              <DashboardInventoryViewImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                disabled={isPending}
              />
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-col gap-2 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={handleSave} disabled={isPending || !item} className="w-full gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full">
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Run type check — must pass clean**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npx tsc --noEmit 2>&1 | grep -v ".next/types"
```

Expected: no output (zero errors).

---

## Task 5: Verify and commit

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/trevorhecht/Developer/repos/nextjs/boisepartyco && npm test
```

Expected: 193 tests pass (existing tests; no new tests added — the upload component is side-effects only and not unit-testable without mocking Cloudinary + FileReader).

- [ ] **Step 2: Start dev server against prod DB and smoke test**

```bash
npm run dev:prod
```

Open `http://localhost:3001/dashboard?view=inventory` (requires login).

Verify:
1. Click any item row to open the Edit Item sheet
2. The "Primary Image URL" text input is gone; a drag-and-drop zone appears instead
3. If the item already has an image URL: a preview thumbnail renders with an X button
4. Drop an image file onto the zone (or click to browse) — spinner appears during upload
5. On success: the preview shows the newly uploaded image; a "Replace image" link appears below
6. Click "Save Changes" — the Cloudinary URL is saved to the item
7. Re-open the sheet — the image preview loads correctly from the saved URL
8. Click the X button to remove the image — preview disappears, zone reappears
9. Save with no image — `primaryImageUrl` is saved as `null`

- [ ] **Step 3: Commit the 4 changed/created files**

Stage only the files touched in this plan:
- `src/utils/cloudinaryUpload.ts`
- `src/app/api/upload-image/route.ts`
- `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ImageUpload.tsx`
- `src/app/(app)/dashboard/components/views/inventory/Dashboard-InventoryView-ItemSheet.tsx`

```
feat: drag-and-drop image upload for inventory items via Cloudinary
```
