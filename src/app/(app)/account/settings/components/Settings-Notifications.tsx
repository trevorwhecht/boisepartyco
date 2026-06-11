"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import QuotePageConsentToggles, {
  type ConsentValue,
} from "@/app/(public)/quote/components/QuotePage-ConsentToggles"

type Props = {
  initialSms: boolean
  initialEmail: boolean
}

export default function SettingsNotifications({ initialSms, initialEmail }: Props) {
  const [consent, setConsent] = useState<ConsentValue>({
    sms: initialSms,
    email: initialEmail,
    account: false,
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(v: ConsentValue) {
    setConsent(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentSms: v.sms, consentEmail: v.email }),
      })
      const json = await res.json()
      if (json.error) toast.error(json.error)
    }, 600)
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-background) p-4 space-y-3">
      <h2 className="text-base font-semibold text-(--color-foreground)">Notifications</h2>
      <QuotePageConsentToggles value={consent} onChange={handleChange} hideAccount />
    </div>
  )
}
