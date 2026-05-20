// src/components/shared/AvailabilityBadge.tsx
type Props = {
  stock: number
  available: number
  hasRange: boolean
}

export default function AvailabilityBadge({ stock, available, hasRange }: Props) {
  if (!hasRange) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#4a5666" }}>
        {stock} in stock
      </span>
    )
  }
  let bg: string, fg: string, label: string, dot: string
  if (available <= 0) {
    bg = "#fbeae6"; fg = "#c0613a"; label = "Fully booked"; dot = "#c0613a"
  } else if (available <= Math.ceil(stock * 0.2)) {
    bg = "#fdf3e2"; fg = "#a26b1d"; label = `Only ${available} left`; dot = "#d99a3a"
  } else {
    bg = "#e7f4ec"; fg = "#2f7d52"; label = `${available} available`; dot = "#2f7d52"
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 11px", borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
      {label}
    </span>
  )
}
