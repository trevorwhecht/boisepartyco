"use client"

import { useEffect } from "react"

// Intercepts browser console.log/warn/error/info in dev and forwards to
// /api/dev-log so output lands in .logs/browser.log alongside server logs.
export default function DevLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const levels = ["log", "warn", "error", "info"] as const
    const originals = Object.fromEntries(levels.map((l) => [l, console[l].bind(console)])) as Record<string, (...a: unknown[]) => void>

    levels.forEach((level) => {
      console[level] = (...args: unknown[]) => {
        originals[level](...args)
        fetch("/api/dev-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level, args, timestamp: new Date().toISOString() }),
        }).catch(() => {})
      }
    })

    return () => {
      levels.forEach((level) => {
        console[level] = originals[level]
      })
    }
  }, [])

  return null
}
