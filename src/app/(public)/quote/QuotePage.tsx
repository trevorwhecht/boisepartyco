"use client"
import { useState, useTransition } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, ArrowLeft, X, Info, CheckCircle } from "lucide-react"
import { useCart } from "@/contexts/CartContext"
import DateRangeField from "@/components/shared/DateRangeField"
import { parseLocalDate, fmtLocalDate } from "@/lib/availability"
import QtyStepper from "@/components/shared/QtyStepper"
import type { DateRange } from "@/components/shared/DateRangePicker"

type Step = "cart" | "contact" | "confirm"

const TAX_RATE = 0.06
const DELIVERY_FEE = 85

function daysBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000))
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function QuotePage() {
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get("from")
  const to = params.get("to")
  const start = from ? parseLocalDate(from) : null
  const end = to ? parseLocalDate(to) : null
  const hasRange = !!(start && end)
  const days = hasRange ? daysBetween(start!, end!) : 1

  const { lines, updateLine, removeLine, clearCart } = useCart()
  const [step, setStep] = useState<Step>("cart")
  const [orderId, setOrderId] = useState<number | null>(null)
  const [contact, setContact] = useState({
    firstName: "", lastName: "", email: "", phone: "", notes: "", venue: "",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty * days, 0)
  const delivery = subtotal > 0 ? DELIVERY_FEE : 0
  const tax = (subtotal + delivery) * TAX_RATE
  const total = subtotal + delivery + tax

  const canContinue = lines.length > 0 && hasRange
  const contactValid = contact.firstName && contact.lastName && contact.email && contact.phone

  const handleDateChange = (r: DateRange) => {
    const next = new URLSearchParams(params.toString())
    if (r.start) next.set("from", fmtLocalDate(r.start)); else next.delete("from")
    if (r.end) next.set("to", fmtLocalDate(r.end)); else next.delete("to")
    router.replace(`/quote?${next.toString()}`)
  }

  const handleSubmit = () => {
    if (!start || !end) return
    const payload = {
      pickupDate: fmtLocalDate(start),
      dropoffDate: fmtLocalDate(end),
      customer: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
      },
      lines: lines.map(l => ({
        kind: l.kind,
        refId: l.refId,
        qty: l.qty,
        name: l.name,
        unitPrice: l.unitPrice,
      })),
      customerNotes: contact.notes || null,
      shipping: contact.venue ? { street: contact.venue, city: "", state: "ID", zipCode: "" } : null,
    }

    startTransition(async () => {
      setSubmitError(null)
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSubmitError(json.error ?? "Something went wrong. Please try again.")
        return
      }
      setOrderId(json.data?.id ?? null)
      clearCart()
      setStep("confirm")
    })
  }

  return (
    <main>
      {/* Page header */}
      <section className="py-8 md:py-12" style={{ background: "var(--shop-paper)" }}>
        <div className="max-w-330 mx-auto px-4 md:px-8">
          <p className="text-xs text-(--shop-ink-soft) mb-3">
            <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Your Quote</span>
          </p>
          <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(28px, 8vw, 56px)" }}>Your quote</h1>
          <p className="mt-2 text-base text-(--shop-ink-soft)">Review your list, confirm dates, and we'll come back within 4 business hours.</p>
        </div>
      </section>

      <section className="py-8 md:py-10 pb-20">
        <div className="max-w-330 mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8 md:gap-12 items-start">

          {/* Left: main content */}
          <div>
            {/* Date bar */}
            <div className="bg-white border border-(--shop-line) rounded-xl p-5 mb-6 flex justify-between items-center">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-(--shop-blue) mb-1">Event dates</div>
                <div className="text-lg font-semibold">
                  {hasRange
                    ? `${start!.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end!.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "No dates selected"}
                </div>
                {hasRange ? <div className="text-sm text-(--shop-ink-soft) mt-0.5">{days} rental day{days === 1 ? "" : "s"}</div> : null}
              </div>
              <DateRangeField start={start} end={end} onChange={handleDateChange} />
            </div>

            {/* Cart step */}
            {step === "cart" ? (
              lines.length === 0 ? (
                <div className="bg-white border border-dashed border-(--shop-line) rounded-xl p-16 text-center">
                  <h3 className="serif text-2xl font-medium mt-3 mb-2">Your quote is empty</h3>
                  <p className="text-sm text-(--shop-ink-soft) mb-5">Browse the inventory and add anything you'd like for your event.</p>
                  <Link href="/tents" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold text-white"
                    style={{ background: "var(--shop-blue)" }}>
                    Browse tents <ArrowRight size={14} />
                  </Link>
                </div>
              ) : (
                <div className="bg-white border border-(--shop-line) rounded-xl overflow-hidden">
                  {lines.map((line, idx) => (
                    <div key={`${line.kind}-${line.refId}`}
                      className="flex gap-3 p-3.5 items-start md:grid md:gap-5 md:p-4 md:items-center md:grid-cols-[72px_1fr_auto_auto_auto]"
                      style={{ borderBottom: idx < lines.length - 1 ? "1px solid #f0f2f5" : "none" }}>
                      {/* Image placeholder */}
                      <div className="w-16 shrink-0 aspect-square bg-(--shop-paper) rounded-lg md:w-auto" />
                      {/* Name + mobile controls */}
                      <div className="flex-1 min-w-0">
                        <span className="serif text-lg md:text-xl font-medium text-(--shop-ink)">{line.name}</span>
                        <div className="text-xs text-(--shop-ink-soft) mt-0.5">
                          ${line.unitPrice.toFixed(0)}/day · {days} day{days === 1 ? "" : "s"}
                        </div>
                        {/* Mobile-only controls row */}
                        <div className="flex items-center gap-2 mt-2.5 md:hidden">
                          <QtyStepper compact value={line.qty} min={1} max={99}
                            onChange={(q) => updateLine(line.refId, line.kind, q)} />
                          <div className="ml-auto mono text-sm font-semibold whitespace-nowrap">
                            ${fmtCurrency(line.unitPrice * line.qty * days)}
                          </div>
                          <button onClick={() => removeLine(line.refId, line.kind)}
                            className="w-8 h-8 border border-(--shop-line) bg-white rounded-lg flex items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      {/* Desktop-only: qty stepper */}
                      <div className="hidden md:block">
                        <QtyStepper compact value={line.qty} min={1} max={99}
                          onChange={(q) => updateLine(line.refId, line.kind, q)} />
                      </div>
                      {/* Desktop-only: total price */}
                      <div className="hidden md:block mono text-sm font-semibold text-right min-w-18">
                        ${fmtCurrency(line.unitPrice * line.qty * days)}
                      </div>
                      {/* Desktop-only: remove button */}
                      <button onClick={() => removeLine(line.refId, line.kind)}
                        className="hidden md:flex w-8 h-8 border border-(--shop-line) bg-white rounded-lg items-center justify-center text-(--shop-ink-soft) hover:text-(--shop-ink) cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}

            {/* Contact step */}
            {step === "contact" ? (
              <div className="bg-white border border-(--shop-line) rounded-xl p-7">
                <h3 className="serif text-3xl font-medium mb-1">Your details</h3>
                <p className="text-sm text-(--shop-ink-soft) mb-6">We'll send your formal quote here within 4 business hours.</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "First name *", key: "firstName", span: 1 },
                    { label: "Last name *", key: "lastName", span: 1 },
                    { label: "Phone *", key: "phone", span: 1 },
                    { label: "Email *", key: "email", span: 1, type: "email" },
                    { label: "Venue / address", key: "venue", span: 2 },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
                      <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">
                        {f.label}
                      </label>
                      <input
                        type={f.type ?? "text"}
                        value={(contact as any)[f.key]}
                        onChange={e => setContact(prev => ({ ...prev, [f.key]: e.target.value }))}
                        inputMode={f.key === "phone" ? "tel" : f.key === "email" ? "email" : "text"}
                        autoComplete={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "on"}
                        className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue)"
                      />
                    </div>
                  ))}
                  <div style={{ gridColumn: "span 2" }}>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-1.5">
                      Anything else we should know?
                    </label>
                    <textarea
                      value={contact.notes}
                      onChange={e => setContact(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-sm focus:outline-none focus:border-(--shop-blue) resize-y"
                    />
                  </div>
                </div>
                {submitError ? (
                  <div className="mt-4 p-3 rounded-lg text-sm" style={{ background: "#fbeae6", color: "#c0613a" }} role="alert">
                    {submitError}
                  </div>
                ) : null}
                <div className="mt-7 flex justify-between">
                  <button onClick={() => setStep("cart")}
                    className="inline-flex items-center gap-1.5 text-sm text-(--shop-ink-soft) cursor-pointer">
                    <ArrowLeft size={13} /> Back to items
                  </button>
                  <button
                    disabled={!contactValid || isPending}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed"
                    style={{ background: contactValid && !isPending ? "var(--shop-blue)" : undefined }}>
                    {isPending ? "Sending…" : "Send quote request"} {isPending ? null : <ArrowRight size={14} />}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Confirm step */}
            {step === "confirm" ? (
              <div className="bg-white border border-(--shop-line) rounded-xl p-14 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "#e7f4ec" }}>
                  <CheckCircle size={28} className="text-(--shop-ok)" />
                </div>
                <h3 className="serif text-4xl font-medium">Quote on the way.</h3>
                <p className="text-sm text-(--shop-ink-soft) mt-4 max-w-sm mx-auto leading-relaxed">
                  We've received your request and are holding your items for 48 hours. Look for a formal quote in your inbox within 4 business hours.
                </p>
                {orderId ? (
                  <div className="mono mt-6 text-xs text-(--shop-ink-soft)">Reference: BPR-{orderId}</div>
                ) : null}
                <div className="mt-7">
                  <Link href="/" className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold text-white"
                    style={{ background: "var(--shop-blue)" }}>
                    Back to home <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right: estimate summary */}
          <aside className="bg-white border border-(--shop-line) rounded-xl p-6 md:sticky md:top-28">
            <h4 className="serif text-2xl font-medium mb-4">Estimate</h4>
            <div className="flex flex-col gap-2.5 text-sm text-(--shop-ink-soft)">
              <div className="flex justify-between">
                <span>Subtotal ({lines.length} item{lines.length === 1 ? "" : "s"})</span>
                <span className="mono font-medium text-(--shop-ink)">${fmtCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery &amp; setup</span>
                <span className="mono font-medium text-(--shop-ink)">{subtotal > 0 ? `$${DELIVERY_FEE}` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (est.)</span>
                <span className="mono font-medium text-(--shop-ink)">${fmtCurrency(tax)}</span>
              </div>
            </div>
            <div className="border-t border-(--shop-line)/60 mt-3.5 pt-3.5 flex justify-between items-baseline">
              <span className="text-sm font-semibold">Estimated total</span>
              <span className="serif font-semibold" style={{ fontSize: 32 }}>${fmtCurrency(total)}</span>
            </div>
            {step === "cart" ? (
              <>
                <button
                  disabled={!canContinue}
                  onClick={() => setStep("contact")}
                  className="mt-5 w-full py-3.5 rounded-full text-sm font-semibold text-white disabled:bg-(--shop-paper) disabled:text-(--shop-ink-soft) cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  style={{ background: canContinue ? "var(--shop-blue)" : undefined }}>
                  Continue to contact info <ArrowRight size={14} />
                </button>
                {!hasRange ? (
                  <p className="mt-2.5 text-xs text-(--shop-ink-soft) text-center">Pick your event dates above to continue.</p>
                ) : null}
              </>
            ) : null}
            <p className="mt-4 text-xs text-(--shop-ink-soft) leading-relaxed">
              <Info size={12} className="inline mr-1" />
              Final total may vary based on site visit and final guest count.
            </p>
          </aside>
        </div>
      </section>
    </main>
  )
}
