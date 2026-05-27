// src/components/shared/QtyStepper.tsx
"use client"

import { useState, useEffect } from "react"
import { Minus, Plus } from "lucide-react"

type Props = {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  compact?: boolean
}

export default function QtyStepper({ value, onChange, min = 0, max = 999, compact }: Props) {
  const [inputValue, setInputValue] = useState(String(value))
  const [isFocused, setIsFocused] = useState(false)

  // Sync display when value changes externally (+ / - buttons or parent update)
  useEffect(() => {
    if (!isFocused) setInputValue(String(value))
  }, [value, isFocused])

  const atMin = value <= min
  const atMax = value >= max

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed) && raw.trim() !== "") {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(clamped)
      setInputValue(String(clamped))
    } else {
      // Empty or invalid — restore original
      setInputValue(String(value))
    }
  }

  const sz = compact ? 34 : 38
  const btnColor = (disabled: boolean) => disabled ? "#d0d5dd" : "#4a5666"

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid #e4e7ec",
      borderRadius: 8,
      overflow: "hidden",
      background: "#fff",
    }}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: sz,
          height: sz,
          background: "transparent",
          border: "none",
          color: btnColor(atMin),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: atMin ? "default" : "pointer",
          flexShrink: 0,
        }}
      >
        <Minus size={14} />
      </button>

      <input
        type="number"
        className="no-spin"
        aria-label="Quantity"
        value={isFocused ? inputValue : String(value)}
        min={min}
        max={max}
        inputMode="numeric"
        onFocus={() => {
          setIsFocused(true)
          setInputValue("")
        }}
        onBlur={(e) => {
          setIsFocused(false)
          commit(e.target.value)
        }}
        onChange={(e) => setInputValue(e.target.value)}
        style={{
          width: compact ? 40 : 48,
          height: sz,
          border: "none",
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          outline: "none",
          background: "transparent",
        }}
      />

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
        style={{
          width: sz,
          height: sz,
          background: "transparent",
          border: "none",
          color: btnColor(atMax),
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: atMax ? "default" : "pointer",
          flexShrink: 0,
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
