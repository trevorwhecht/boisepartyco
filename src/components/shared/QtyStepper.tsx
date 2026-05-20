// src/components/shared/QtyStepper.tsx
"use client"

import { Minus, Plus } from "lucide-react"

type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  compact?: boolean
}

export default function QtyStepper({ value, onChange, min = 0, max = 999, compact }: Props) {
  const sz = compact ? 28 : 32
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #e4e7ec", borderRadius: 8, overflow: "hidden" }}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width: sz, height: sz, background: "#fff", border: "none", color: "#4a5666", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        aria-label="Quantity"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        style={{ width: 44, height: sz, border: "none", textAlign: "center", fontSize: 13, fontWeight: 600, outline: "none" }}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width: sz, height: sz, background: "#fff", border: "none", color: "#4a5666", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
