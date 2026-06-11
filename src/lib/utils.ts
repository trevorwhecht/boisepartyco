import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, getYear, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null,
): string | null {
  if (!startDate) return null
  const start = startDate instanceof Date ? startDate : parseISO(startDate)
  const end = endDate ? (endDate instanceof Date ? endDate : parseISO(endDate)) : null
  if (!end) return format(start, "MMM d")
  const currentYear = getYear(new Date())
  return getYear(end) !== currentYear
    ? `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`
    : `${format(start, "MMM d")}–${format(end, "MMM d")}`
}
