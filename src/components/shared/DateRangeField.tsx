// src/components/shared/DateRangeField.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar } from "lucide-react"
import DateRangePicker, { type DateRange } from "./DateRangePicker"
import { fmtRangeShort, daysBetween } from "@/lib/availability"

type Props = {
  start: Date | null
  end: Date | null
  onChange: (r: DateRange) => void
  compact?: boolean
  dark?: boolean
  fullWidth?: boolean
  // Controlled mode — when provided, the caller (DatePickerContext) owns open state
  externalOpen?: boolean
  onExternalChange?: (open: boolean) => void
}

export default function DateRangeField({
  start, end, onChange,
  compact, dark, fullWidth,
  externalOpen, onExternalChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const isControlled = externalOpen !== undefined
  const showPicker = isControlled ? externalOpen : open

  // When opened externally, capture anchor rect from the button
  useEffect(() => {
    if (externalOpen && ref.current) {
      setAnchorRect(ref.current.getBoundingClientRect())
    }
  }, [externalOpen])

  const close = () => {
    if (isControlled) onExternalChange?.(false)
    else setOpen(false)
  }

  const toggle = () => {
    if (ref.current) setAnchorRect(ref.current.getBoundingClientRect())
    if (isControlled) {
      onExternalChange?.(!externalOpen)
    } else {
      setOpen((o) => !o)
    }
  }

  useEffect(() => {
    if (!showPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest("[data-cal-pop]") || target.closest("[data-cal-trigger]")) return
      close()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showPicker, isControlled, externalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const label = start && end
    ? fmtRangeShort(start, end)
    : start
    ? `${fmtRangeShort(start, start).split(",")[0]} – pick end`
    : "Pick event dates"

  const style: React.CSSProperties = compact ? {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 14px", borderRadius: 999,
    background: dark ? "rgba(255,255,255,0.12)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.25)" : "#e4e7ec"}`,
    color: dark ? "#fff" : "#1a2433",
    fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
    width: fullWidth ? "100%" : undefined,
  } : {
    display: "inline-flex", alignItems: "center", gap: 10,
    padding: "14px 22px", borderRadius: 8,
    background: "#fff", border: "1px solid #e4e7ec",
    color: "#1a2433", fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
  }

  return (
    <>
      <button type="button" data-cal-trigger ref={ref} onClick={toggle} style={style}>
        <Calendar size={compact ? 14 : 16} />
        <span style={{ fontWeight: 500 }}>{label}</span>
        {start && end && compact ? (
          <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>
            {daysBetween(start, end)}d
          </span>
        ) : null}
      </button>
      {showPicker ? (
        <DateRangePicker
          start={start}
          end={end}
          onChange={onChange}
          onClose={close}
          anchorRect={anchorRect}
        />
      ) : null}
    </>
  )
}
