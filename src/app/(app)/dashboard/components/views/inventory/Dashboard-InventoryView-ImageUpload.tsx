"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Upload, X } from "lucide-react"

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
  onUploadingChange?: (uploading: boolean) => void
  itemId?: number
  fallbackImageUrl?: string
}

export default function DashboardInventoryViewImageUpload({ value, onChange, disabled, onUploadingChange, itemId, fallbackImageUrl }: Props) {
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

    onUploadingChange?.(true)
    startTransition(async () => {
      try {
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
            publicId: itemId != null ? `item_${itemId}` : `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          }),
        })

        const json = await res.json()
        if (!res.ok || json.error) {
          toast.error(json.details ?? json.error ?? "Upload failed")
          return
        }
        onChange(json.url)
        toast.success("Image uploaded")
      } finally {
        onUploadingChange?.(false)
      }
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
          <img src={value} alt="Item image" className="w-full h-40 object-contain" />
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
          onClick={() => inputRef.current?.click()}
          disabled={isDisabled}
          className="text-xs text-(--color-muted) hover:text-(--color-foreground) underline transition-colors disabled:opacity-50"
        >
          Replace image
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} disabled={isDisabled} />
      </div>
    )
  }

  if (fallbackImageUrl) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-md overflow-hidden border border-(--color-border) bg-(--color-surface)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fallbackImageUrl} alt="Current library image" className="w-full h-40 object-contain" />
          <span className="absolute top-2 left-2 rounded text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-(--color-background)/80 text-(--color-muted)">
            Library image
          </span>
        </div>
        <button
          type="button"
          onClick={() => !isDisabled && inputRef.current?.click()}
          disabled={isDisabled}
          className="text-xs text-(--color-muted) hover:text-(--color-foreground) underline transition-colors disabled:opacity-50"
        >
          Upload custom image
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} disabled={isDisabled} />
      </div>
    )
  }

  return (
    <div
      onDragEnter={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
      }}
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
