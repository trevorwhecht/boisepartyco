"use client"
import { useState, useTransition, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, X, CheckCircle } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import { useCart } from "@/contexts/CartContext"
import { useInventoryMode } from "@/contexts/InventoryModeContext"
import DateRangeField from "@/components/shared/DateRangeField"
import { parseLocalDate, fmtLocalDate } from "@/lib/availability"
import QtyStepper from "@/components/shared/QtyStepper"
import type { DateRange } from "@/components/shared/DateRangePicker"
import type { CartLine } from "@/models/inventory"
import QuotePageContactStep, { type ContactState } from "./components/QuotePage-ContactStep"
import type { ConsentValue } from "./components/QuotePage-ConsentToggles"

type Step = "cart" | "contact" | "confirm"

const TAX_RATE = 0.06

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
  const { data: session } = useSession()
  const [consent, setConsent] = useState<ConsentValue>({ sms: false, email: false, account: false })
  const [password, setPassword] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const mode = useInventoryMode()
  const [step, setStep] = useState<Step>("cart")
  // availMap[`${kind}-${refId}`] = max qty the user is allowed to request
  const [availMap, setAvailMap] = useState<Record<string, number>>({})
  // imageMap[`${kind}-${refId}`] = imageUrl fetched from DB for legacy cart lines missing imageUrl
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({})
  // Stable key for the effect — only re-fetch when item set changes, not on qty edits
  const lineKey = lines.map(l => `${l.kind}-${l.refId}`).join(",")
  useEffect(() => {
    if (!start || !end || lines.length === 0) { setAvailMap({}); return }
    if (mode === "off") { setAvailMap({}); return }
    const itemIds = lines.filter(l => l.kind === "item").map(l => l.refId)
    const configIds = lines.filter(l => l.kind === "tentConfig").map(l => l.refId)
    const qs = new URLSearchParams({ from: fmtLocalDate(start), to: fmtLocalDate(end) })
    if (itemIds.length) qs.set("itemIds", itemIds.join(","))
    if (configIds.length) qs.set("configIds", configIds.join(","))
    fetch(`/api/inventory/availability?${qs}`)
      .then(r => r.json())
      .then(json => {
        if (!json.data) return
        const map: Record<string, number> = {}
        for (const [id, a] of Object.entries(json.data.items as Record<string, { available: number }>)) {
          map[`item-${id}`] = a.available
        }
        for (const [id, a] of Object.entries(json.data.configs as Record<string, { available: number }>)) {
          map[`tentConfig-${id}`] = a.available
        }
        setAvailMap(map)
      })
      .catch(() => {}) // silent — gracefully degrades to no-cap
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.toISOString(), end?.toISOString(), lineKey, mode])

  // Backfill imageUrl for lines loaded from localStorage before imageUrl was captured at add-time
  useEffect(() => {
    if (lines.length === 0) return
    const missing = lines.filter(l => !l.imageUrl)
    if (missing.length === 0) return
    const itemIds = missing.filter(l => l.kind === "item").map(l => l.refId)
    const configIds = missing.filter(l => l.kind === "tentConfig").map(l => l.refId)
    const qs = new URLSearchParams()
    if (itemIds.length) qs.set("itemIds", itemIds.join(","))
    if (configIds.length) qs.set("configIds", configIds.join(","))
    fetch(`/api/inventory/images?${qs}`)
      .then(r => r.json())
      .then(json => { if (json.data) setImageMap(json.data) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineKey])

  // Pre-fill contact form and consent from session when a regular user is logged in
  useEffect(() => {
    if (!session?.user) return
    const role = (session.user as any).role
    if (role === "admin" || role === "employee") return
    setContact(prev => ({
      ...prev,
      firstName: (session.user as any).firstName || prev.firstName,
      lastName: (session.user as any).lastName || prev.lastName,
      email: session.user?.email || prev.email,
      phone: (session.user as any).phone || prev.phone,
    }))
    // Pre-fill consent from saved profile — only set, never unset
    const s = session.user as any
    if (s.consentSms || s.consentEmail) {
      setConsent(prev => ({
        ...prev,
        sms: prev.sms || !!s.consentSms,
        email: prev.email || !!s.consentEmail,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email])

  const lineImage = (line: CartLine) => line.imageUrl ?? imageMap[`${line.kind}-${line.refId}`] ?? null

  const lineMax = (line: CartLine) => {
    const avail = availMap[`${line.kind}-${line.refId}`]
    // Use whichever is greater: what's available or what's already in cart
    // (never hard-block a qty they already set; just stop them going higher)
    return avail !== undefined ? Math.max(line.qty, avail) : 99
  }
  const [orderId, setOrderId] = useState<number | null>(null)
  const [contact, setContact] = useState<ContactState>({
    firstName: "", lastName: "", email: "", phone: "", notes: "", venue: "",
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty * days, 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  const canContinue = lines.length > 0 && hasRange

  const handleDateChange = (r: DateRange) => {
    const next = new URLSearchParams(params.toString())
    if (r.start) next.set("from", fmtLocalDate(r.start)); else next.delete("from")
    if (r.end) next.set("to", fmtLocalDate(r.end)); else next.delete("to")
    router.replace(`/quote?${next.toString()}`)
  }

  const handleSubmit = () => {
    if (!start || !end) return

    startTransition(async () => {
      setSubmitError(null)

      try {
        // If "Create account" was selected, create the account then sign in before submitting
        if (consent.account && password) {
          const createRes = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: contact.email,
              password,
              firstName: contact.firstName,
              lastName: contact.lastName,
              phone: contact.phone || undefined,
            }),
          })
          const createJson = await createRes.json()
          if (!createRes.ok || createJson.error) {
            setSubmitError(createJson.error ?? "Failed to create account. Please try again.")
            return
          }
          // Sign in so the session reflects the new account
          await signIn("credentials", { email: contact.email, password, redirect: false })
        }

        const payload: Record<string, any> = {
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
          consentSms: consent.sms,
          consentEmail: consent.email,
        }

        if (selectedUserId) payload.userId = selectedUserId

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
        clearCart()
        if (consent.account && json.data?.token) {
          router.push(`/orders/${json.data.token}`)
          return
        }
        setOrderId(json.data?.id ?? null)
        setStep("confirm")
      } catch {
        setSubmitError("Something went wrong. Please try again.")
      }
    })
  }

  if (mode === "off") {
    return (
      <main>
        <section className="py-8 md:py-12" style={{ background: "var(--shop-paper)" }}>
          <div className="max-w-330 mx-auto px-4 md:px-8">
            <p className="text-xs text-(--shop-ink-soft) mb-3">
              <a href="/" className="hover:text-(--shop-ink)">Home</a> / <span className="text-(--shop-ink)">Your Quote</span>
            </p>
            <h1 className="serif font-medium leading-tight tracking-tight" style={{ fontSize: "clamp(28px, 8vw, 56px)" }}>Ready to book?</h1>
            <p className="mt-2 text-base text-(--shop-ink-soft)">Reach out directly and we'll walk you through availability and pricing.</p>
          </div>
        </section>
        <section className="py-16 pb-24">
          <div className="max-w-330 mx-auto px-4 md:px-8 flex justify-center">
            <div className="bg-white border border-(--shop-line) rounded-xl p-14 text-center max-w-md w-full">
              <h3 className="serif text-3xl font-medium mb-3">Get in touch</h3>
              <p className="text-sm text-(--shop-ink-soft) leading-relaxed mb-6">
                Browse our inventory, then reach out — we'll confirm availability and send you a formal quote soon.
              </p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white"
                style={{ background: "var(--shop-blue)" }}>
                Contact Us <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      {/* Hero image */}
      <section className="relative h-52 md:h-72 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1463947628408-f8581a2f4aca?w=1600&q=80"
          alt="Blue sky with clouds"
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 30%" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-330 mx-auto px-4 md:px-8 pb-6 md:pb-8">
            <p className="text-xs text-white/70 mb-2">
              <a href="/" className="hover:text-white/90">Home</a> / <span className="text-white/90">Your Quote</span>
            </p>
            <h1 className="serif font-medium leading-tight tracking-tight text-white" style={{ fontSize: "clamp(28px, 8vw, 56px)" }}>Your quote</h1>
            <p className="mt-1 text-base text-white/80">Review your list, confirm dates, and we'll be back to you soon.</p>
          </div>
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
                      {/* Thumbnail */}
                      <div className="w-16 shrink-0 aspect-square relative rounded-lg overflow-hidden bg-(--shop-paper) md:w-auto">
                        {lineImage(line) ? (
                          <Image src={lineImage(line)!} alt={line.name} fill sizes="72px" className="object-cover object-center" />
                        ) : null}
                      </div>
                      {/* Name + mobile controls */}
                      <div className="flex-1 min-w-0">
                        <span className="serif text-lg md:text-xl font-medium text-(--shop-ink)">{line.name}</span>
                        <div className="text-xs text-(--shop-ink-soft) mt-0.5">
                          ${line.unitPrice.toFixed(0)}/day · {days} day{days === 1 ? "" : "s"}
                        </div>
                        {/* Mobile-only controls row */}
                        <div className="flex items-center gap-2 mt-2.5 md:hidden">
                          <QtyStepper compact value={line.qty} min={1} max={lineMax(line)}
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
              <QuotePageContactStep
                session={session}
                contact={contact}
                onContactChange={setContact}
                consent={consent}
                onConsentChange={setConsent}
                password={password}
                onPasswordChange={setPassword}
                onSelectUserId={setSelectedUserId}
                onBack={() => setStep("cart")}
                onSubmit={handleSubmit}
                onClearError={() => setSubmitError(null)}
                isPending={isPending}
                submitError={submitError}
              />
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
                  We've received your request and are holding your items for 48 hours. Look for a formal quote in your inbox soon.
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
                <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
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
          </aside>
        </div>
      </section>
    </main>
  )
}
