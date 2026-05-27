"use client"

import { createContext, useContext, useState, useCallback } from "react"

type DatePickerContextValue = {
  isOpen: boolean
  openPicker: () => void
  closePicker: () => void
}

const DatePickerContext = createContext<DatePickerContextValue | null>(null)

export function DatePickerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openPicker = useCallback(() => setIsOpen(true), [])
  const closePicker = useCallback(() => setIsOpen(false), [])

  return (
    <DatePickerContext.Provider value={{ isOpen, openPicker, closePicker }}>
      {children}
    </DatePickerContext.Provider>
  )
}

export function useDatePicker() {
  const ctx = useContext(DatePickerContext)
  if (!ctx) throw new Error("useDatePicker must be used inside DatePickerProvider")
  return ctx
}
