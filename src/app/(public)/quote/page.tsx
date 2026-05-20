import { Suspense } from "react"
import QuotePage from "./QuotePage"

export default function QuoteRoute() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-(--shop-ink-soft)">Loading…</div>}>
      <QuotePage />
    </Suspense>
  )
}
