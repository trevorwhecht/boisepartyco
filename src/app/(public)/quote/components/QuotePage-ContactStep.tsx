"use client"
import { useState } from "react"
import { ArrowLeft, ArrowRight, Loader2, UserRound, Eye, EyeOff } from "lucide-react"
import type { Session } from "next-auth"
import { useAccountPanel } from "@/contexts/AccountPanelContext"
import { useCallback } from "react"
import QuotePageConsentToggles, { type ConsentValue } from "./QuotePage-ConsentToggles"
import QuotePageAdminCustomerSelect from "./QuotePage-AdminCustomerSelect"

export interface ContactState {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
  venue: string
}

interface Props {
  session: Session | null
  contact: ContactState
  onContactChange: (next: ContactState) => void
  consent: ConsentValue
  onConsentChange: (next: ConsentValue) => void
  password: string
  onPasswordChange: (p: string) => void
  onSelectUserId: (id: string | null) => void
  onBack: () => void
  onSubmit: () => void
  onClearError: () => void
  isPending: boolean
  submitError: string | null
}

const FORM_FIELDS: {
  label: string
  key: keyof ContactState
  span: 1 | 2
  type: string
  inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete: string
}[] = [
  { label: "First name *", key: "firstName", span: 1, type: "text", inputMode: "text", autoComplete: "given-name" },
  { label: "Last name *", key: "lastName", span: 1, type: "text", inputMode: "text", autoComplete: "family-name" },
  { label: "Phone *", key: "phone", span: 1, type: "tel", inputMode: "tel", autoComplete: "tel" },
  { label: "Email *", key: "email", span: 1, type: "email", inputMode: "email", autoComplete: "email" },
  { label: "Venue / address", key: "venue", span: 2, type: "text", inputMode: "text", autoComplete: "street-address" },
]

export default function QuotePageContactStep({
  session, contact, onContactChange, consent, onConsentChange,
  password, onPasswordChange, onSelectUserId,
  onBack, onSubmit, onClearError, isPending, submitError,
}: Props) {
  const { openPanel, openPanelWithEmail } = useAccountPanel()
  const [existingUserSelected, setExistingUserSelected] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const role = session?.user?.role
  const isStaff = role === "admin" || role === "employee"
  const isLoggedIn = !!session && !isStaff

  // When admin picks an existing user, the form collapses — contact fields not required
  const showContactForm = !isStaff || !existingUserSelected
  const contactValid = !!(contact.firstName && contact.lastName && contact.email && contact.phone)
  // Logged-in users have account notifications by default — no selection required
  const consentValid = isLoggedIn || consent.sms || consent.email || consent.account
  const passwordValid = !consent.account || password.length >= 8
  const canSubmit = (showContactForm ? contactValid : true) && (isStaff || consentValid) && passwordValid && !isPending

  const submitLabel = consent.account && !isStaff ? "Create & send" : "Send quote request"

  const setField = useCallback((key: keyof ContactState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (key === "email") onClearError()
      onContactChange({ ...contact, [key]: e.target.value })
    },
  [contact, onContactChange, onClearError]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectUserId(id: string | null) {
    setExistingUserSelected(id !== null)
    onSelectUserId(id)
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); onSubmit() }}
      className="bg-white border border-(--shop-line) rounded-xl p-7"
    >
      <h3 className="serif text-3xl font-medium mb-1">Your details</h3>
      <p className="text-sm mb-6" style={{ color: "var(--shop-ink-soft)" }}>
        We'll send your formal quote here soon.
      </p>

      {/* Admin/employee: customer search combobox */}
      {isStaff ? (
        <div className="mb-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1.5"
            style={{ color: "var(--shop-ink-soft)" }}>
            Customer
          </div>
          <QuotePageAdminCustomerSelect onSelect={handleSelectUserId} />
        </div>
      ) : null}

      {/* Anonymous: sign in to auto-fill pill */}
      {!isLoggedIn && !isStaff ? (
        <button
          type="button"
          onClick={openPanel}
          className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm cursor-pointer"
          style={{
            border: "1px solid var(--shop-line)",
            background: "var(--shop-paper)",
            color: "var(--shop-ink-soft)",
            transition: "border-color 0.15s, color 0.15s",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "var(--shop-blue)"
            e.currentTarget.style.color = "var(--shop-blue)"
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--shop-line)"
            e.currentTarget.style.color = "var(--shop-ink-soft)"
          }}
        >
          <UserRound size={14} />
          Have an account? Sign in to auto-fill
        </button>
      ) : null}

      {/* Contact fields — hidden when admin has selected an existing user */}
      {showContactForm ? (
      <div className="grid grid-cols-2 gap-4">
        {FORM_FIELDS.map(f => (
          <div key={f.key} style={{ gridColumn: `span ${f.span}` }}>
            <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: "var(--shop-ink-soft)" }}>
              {f.label}
            </label>
            <input
              type={f.type}
              value={contact[f.key]}
              onChange={setField(f.key)}
              inputMode={f.inputMode}
              autoComplete={f.autoComplete}
              className="w-full px-3.5 py-2.5 rounded-lg text-base focus:outline-none"
              style={{
                border: "1px solid var(--shop-line)",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.currentTarget.style.borderColor = "var(--shop-blue)")}
              onBlur={e => (e.currentTarget.style.borderColor = "var(--shop-line)")}
            />
          </div>
        ))}
        <div style={{ gridColumn: "span 2" }}>
          <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: "var(--shop-ink-soft)" }}>
            Anything else we should know?
          </label>
          <textarea
            value={contact.notes}
            onChange={setField("notes")}
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none resize-y"
            style={{ border: "1px solid var(--shop-line)" }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--shop-blue)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--shop-line)")}
          />
        </div>
      </div>
      ) : null}

      {/* Consent toggles — not shown for admin/employee */}
      {!isStaff ? (
        <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--shop-line)" }}>
          <QuotePageConsentToggles value={consent} onChange={onConsentChange} hideAccount={isLoggedIn} />

          {/* Password field — reveals when "Create account" is selected */}
          {consent.account ? (
            <div className="mt-4">
              <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--shop-ink-soft)" }}>
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-base focus:outline-none"
                  style={{ border: "1px solid var(--shop-line)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--shop-blue)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--shop-line)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: "var(--shop-ink-soft)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password.length > 0 && password.length < 8 ? (
                <p className="text-xs mt-1" style={{ color: "var(--color-danger)" }} role="alert">
                  Password must be at least 8 characters
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {submitError ? (
        <div className="mt-4 p-3 rounded-lg text-sm" role="alert"
          style={{ background: "#fbeae6", color: "#c0613a" }}>
          {submitError.toLowerCase().includes("already in use") ? (
            <>
              Email already in use.{" "}
              <button
                type="button"
                onClick={() => openPanelWithEmail(contact.email)}
                className="underline cursor-pointer font-medium"
                style={{ color: "inherit" }}
              >
                Sign in
              </button>
              {" "}to your existing account.
            </>
          ) : submitError}
        </div>
      ) : null}

      <div className="mt-7 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm cursor-pointer"
          style={{ color: "var(--shop-ink-soft)" }}
        >
          <ArrowLeft size={13} /> Back to items
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold text-white cursor-pointer disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? "var(--shop-blue)" : "var(--shop-paper)",
            color: canSubmit ? "#fff" : "var(--shop-ink-soft)",
          }}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          {isPending ? "Sending…" : submitLabel}
          {isPending ? null : <ArrowRight size={14} />}
        </button>
      </div>
    </form>
  )
}
