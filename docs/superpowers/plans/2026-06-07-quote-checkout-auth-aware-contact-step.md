# Quote Checkout — Auth-Aware Contact Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add session-aware flows to the `/quote` contact step: anonymous users get a "sign in to auto-fill" pill and consent toggles; logged-in users get pre-filled editable fields; admin/employee users get a customer combobox and no consent section.

**Architecture:** `AccountPanelContext` decouples the navbar account panel open/close state so `QuotePage` can trigger it without prop drilling. The contact step is extracted to `QuotePage-ContactStep.tsx` which renders one of three flows based on session role. Consent choices (`sms`, `email`, `account`) are stored on the `Order` model. An optional `userId` in the order payload lets admin bypass the guest upsert.

**Tech Stack:** Next.js App Router · NextAuth v4 (`useSession`, `signIn`) · Prisma (schema migration) · React `useTransition` · Tailwind 4 CSS variables · `--shop-blue`, `--shop-line`, `--shop-ink`, `--shop-ink-soft`, `--shop-paper` color tokens

---

## File Map

| Action | File |
|---|---|
| **Create** | `src/contexts/AccountPanelContext.tsx` |
| **Modify** | `src/app/(public)/layout.tsx` — add `AccountPanelProvider` |
| **Modify** | `src/components/shared/layout/ShopHeader.tsx` — consume context instead of local state |
| **Create** | `src/app/api/users/search/route.ts` |
| **Create** | `src/app/(public)/quote/components/QuotePage-ConsentToggles.tsx` |
| **Create** | `src/app/(public)/quote/components/QuotePage-AdminCustomerSelect.tsx` |
| **Create** | `src/app/(public)/quote/components/QuotePage-ContactStep.tsx` |
| **Modify** | `src/app/api/orders/route.ts` — `handlePublicShopQuote` accepts `userId`, `consentSms`, `consentEmail` |
| **Modify** | `src/app/(public)/quote/QuotePage.tsx` — add session, consent state, wire up contact step |
| **Modify** | `prisma/schema.prisma` — add `consentSms` and `consentEmail` to `Order` |

---

## Task 1: Add consent fields to Order schema

**Files:**
- Modify: `prisma/schema.prisma` (Order model, around line 68)

- [ ] **Step 1: Add the two consent fields to the Order model**

  Open `prisma/schema.prisma`. Inside the `Order` model, after the `taxDeferralRequested Boolean @default(false)` line (line 99), add:

  ```prisma
  consentSms        Boolean   @default(false)
  consentEmail      Boolean   @default(false)
  ```

  The Order model block should now contain these two lines near the other boolean fields.

- [ ] **Step 2: Run the migration**

  > ⚠️ Use the `/migrate-dev` skill (or run the command below). Do NOT run this autonomously without the user's confirmation if in doubt.

  ```bash
  npx prisma migrate dev --name add_order_consent_fields
  ```

  Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify the Prisma client regenerated**

  ```bash
  npx prisma generate
  ```

  Expected: `Generated Prisma Client` with no errors.

---

## Task 2: AccountPanelContext + update PublicLayout + update ShopHeader

**Files:**
- Create: `src/contexts/AccountPanelContext.tsx`
- Modify: `src/app/(public)/layout.tsx`
- Modify: `src/components/shared/layout/ShopHeader.tsx`

- [ ] **Step 1: Create AccountPanelContext**

  Create `src/contexts/AccountPanelContext.tsx`:

  ```tsx
  "use client"
  import { createContext, useContext, useState } from "react"

  interface AccountPanelContextValue {
    isOpen: boolean
    openPanel: () => void
    closePanel: () => void
  }

  const AccountPanelContext = createContext<AccountPanelContextValue | null>(null)

  export function AccountPanelProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    return (
      <AccountPanelContext.Provider value={{
        isOpen,
        openPanel: () => setIsOpen(true),
        closePanel: () => setIsOpen(false),
      }}>
        {children}
      </AccountPanelContext.Provider>
    )
  }

  export function useAccountPanel(): AccountPanelContextValue {
    const ctx = useContext(AccountPanelContext)
    if (!ctx) throw new Error("useAccountPanel must be used within AccountPanelProvider")
    return ctx
  }
  ```

- [ ] **Step 2: Add AccountPanelProvider to the public layout**

  Modify `src/app/(public)/layout.tsx`. Add the import and wrap the existing tree:

  ```tsx
  // src/app/(public)/layout.tsx
  import { Suspense } from "react"
  import ShopHeader from "@/components/shared/layout/ShopHeader"
  import ShopFooter from "@/components/shared/layout/ShopFooter"
  import { CartProvider } from "@/contexts/CartContext"
  import { DatePickerProvider } from "@/contexts/DatePickerContext"
  import { AccountPanelProvider } from "@/contexts/AccountPanelContext"
  import { getInventoryMode } from "@/lib/settings"
  import { InventoryModeProvider } from "@/contexts/InventoryModeContext"

  export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const mode = await getInventoryMode()
    return (
      <InventoryModeProvider mode={mode}>
        <CartProvider>
          <DatePickerProvider>
            <AccountPanelProvider>
              <Suspense fallback={<div style={{ height: 137, background: "#fff", borderBottom: "1px solid #e4e7ec" }} />}>
                <ShopHeader />
              </Suspense>
              {children}
              <ShopFooter />
            </AccountPanelProvider>
          </DatePickerProvider>
        </CartProvider>
      </InventoryModeProvider>
    )
  }
  ```

- [ ] **Step 3: Update ShopHeader to consume AccountPanelContext instead of local state**

  In `src/components/shared/layout/ShopHeader.tsx`:

  1. Add the import (after the existing context imports, e.g. near line 17):
     ```tsx
     import { useAccountPanel } from "@/contexts/AccountPanelContext"
     ```

  2. Inside the `ShopHeader` function, **remove** the line:
     ```tsx
     const [accountOpen, setAccountOpen] = useState(false)
     ```
     And **add** in its place:
     ```tsx
     const { isOpen: accountOpen, openPanel, closePanel } = useAccountPanel()
     ```

  3. Update the `closeAll` function (around line 162):
     ```tsx
     function closeAll() {
       setNavOpen(false)
       closePanel()
     }
     ```

  4. Update the account button `onClick` (around line 320):
     ```tsx
     onClick={() => { accountOpen ? closePanel() : openPanel(); setNavOpen(false) }}
     ```

  The rest of the file uses `accountOpen` (read-only) and `closeAll()` — both still work correctly after this change.

- [ ] **Step 4: Verify the header still works**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in `ShopHeader.tsx` or `AccountPanelContext.tsx`.

---

## Task 3: GET /api/users/search

**Files:**
- Create: `src/app/api/users/search/route.ts`

- [ ] **Step 1: Create the search endpoint**

  Create `src/app/api/users/search/route.ts`:

  ```ts
  import { NextResponse } from "next/server"
  import { getServerSession } from "next-auth"
  import { authOptions } from "@/lib/auth"
  import { prisma } from "@/lib/prisma"

  export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
    const role = session.user.role
    if (role !== "admin" && role !== "employee") {
      return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() ?? ""

    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      } : {},
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ data: users, error: null })
  }
  ```

- [ ] **Step 2: Type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in the new file.

---

## Task 4: QuotePage-ConsentToggles component

**Files:**
- Create: `src/app/(public)/quote/components/QuotePage-ConsentToggles.tsx`

- [ ] **Step 1: Create the consent toggles component**

  Create `src/app/(public)/quote/components/QuotePage-ConsentToggles.tsx`:

  ```tsx
  "use client"
  import { MessageSquare, Mail, UserPlus } from "lucide-react"

  export interface ConsentValue {
    sms: boolean
    email: boolean
    account: boolean
  }

  interface Props {
    value: ConsentValue
    onChange: (v: ConsentValue) => void
  }

  const OPTIONS = [
    { key: "sms" as const, label: "Text", Icon: MessageSquare },
    { key: "email" as const, label: "Email", Icon: Mail },
    { key: "account" as const, label: "Save my info", Icon: UserPlus },
  ]

  export default function QuotePageConsentToggles({ value, onChange }: Props) {
    function toggle(key: keyof ConsentValue) {
      onChange({ ...value, [key]: !value[key] })
    }

    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-2">
          Notify me via{" "}
          <span className="text-(--color-danger) normal-case tracking-normal font-normal">
            (choose at least one)
          </span>
        </div>

        {/* Desktop: pill toggles (md+) */}
        <div className="hidden md:flex gap-2 flex-wrap">
          {OPTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer"
              style={{
                border: value[key] ? "1.5px solid var(--shop-blue)" : "1.5px solid var(--shop-line)",
                background: value[key] ? "#eff6ff" : "#fff",
                color: value[key] ? "var(--shop-blue)" : "var(--shop-ink-soft)",
                transition: "border-color 0.15s, background 0.15s, color 0.15s",
              }}
              aria-pressed={value[key]}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Mobile: toggle rows (<md) */}
        <div className="flex flex-col md:hidden divide-y" style={{ borderColor: "var(--shop-line)" }}>
          {OPTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="flex items-center justify-between py-3 cursor-pointer w-full text-left"
              aria-pressed={value[key]}
            >
              <div className="flex items-center gap-2.5 text-sm"
                style={{ color: value[key] ? "var(--shop-blue)" : "var(--shop-ink)" }}>
                <Icon size={15} />
                <span style={{ fontWeight: value[key] ? 600 : 400 }}>{label}</span>
              </div>
              {/* iOS-style toggle pill */}
              <div
                style={{
                  width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  background: value[key] ? "var(--shop-blue)" : "#d1d5db",
                  position: "relative",
                  transition: "background 0.2s",
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 7,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  position: "absolute", top: 3,
                  transform: value[key] ? "translateX(19px)" : "translateX(3px)",
                  transition: "transform 0.2s",
                }} />
              </div>
            </button>
          ))}
        </div>

        {/* SMS disclosure — shown only when Text is toggled on */}
        {value.sms ? (
          <p className="text-[10px] leading-relaxed mt-1.5"
            style={{ color: "var(--shop-ink-soft)", opacity: 0.75 }}>
            Msg &amp; data rates may apply. Msg frequency varies. Reply STOP to cancel, HELP for help.{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>
          </p>
        ) : null}
      </div>
    )
  }
  ```

- [ ] **Step 2: Type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in the new file.

---

## Task 5: QuotePage-AdminCustomerSelect component

**Files:**
- Create: `src/app/(public)/quote/components/QuotePage-AdminCustomerSelect.tsx`

- [ ] **Step 1: Create the admin customer combobox**

  Create `src/app/(public)/quote/components/QuotePage-AdminCustomerSelect.tsx`:

  ```tsx
  "use client"
  import { useState, useEffect, useRef } from "react"
  import { Search, X } from "lucide-react"

  interface UserResult {
    id: string
    firstName: string
    lastName: string
    email: string
  }

  interface Props {
    onSelect: (userId: string | null) => void
  }

  export default function QuotePageAdminCustomerSelect({ onSelect }: Props) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<UserResult[]>([])
    const [selected, setSelected] = useState<UserResult | null>(null)
    const [loading, setLoading] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      if (selected) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!query.trim()) { setResults([]); return }

      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
          const json = await res.json()
          setResults(json.data ?? [])
        } finally {
          setLoading(false)
        }
      }, 250)

      return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, selected])

    function selectUser(user: UserResult) {
      setSelected(user)
      setQuery("")
      setResults([])
      onSelect(user.id)
    }

    function clear() {
      setSelected(null)
      onSelect(null)
    }

    if (selected) {
      return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ border: "1px solid var(--shop-line)", background: "var(--shop-paper)" }}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold" style={{ color: "var(--shop-ink)" }}>
              {selected.firstName} {selected.lastName}
            </div>
            <div className="text-xs truncate" style={{ color: "var(--shop-ink-soft)" }}>
              {selected.email}
            </div>
          </div>
          <button type="button" onClick={clear}
            className="shrink-0 cursor-pointer"
            style={{ color: "var(--shop-ink-soft)" }}
            aria-label="Clear selection">
            <X size={15} />
          </button>
        </div>
      )
    }

    return (
      <div className="relative mb-5">
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
          style={{ border: "1px solid var(--shop-line)", background: "#fff" }}>
          <Search size={14} style={{ color: "var(--shop-ink-soft)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="New guest / customer"
            className="flex-1 text-sm bg-transparent focus:outline-none"
            style={{ color: "var(--shop-ink)" }}
          />
          {loading ? (
            <div className="w-3 h-3 rounded-full border-t-transparent animate-spin shrink-0"
              style={{ border: "1.5px solid var(--shop-blue)" }} />
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-md overflow-hidden z-20"
            style={{ background: "#fff", border: "1px solid var(--shop-line)" }}>
            {results.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                onClick={() => selectUser(user)}
                className="w-full text-left px-4 py-3 cursor-pointer"
                style={{
                  borderBottom: idx < results.length - 1 ? "1px solid var(--shop-line)" : "none",
                  background: "#fff",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--shop-paper)")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
              >
                <div className="text-sm font-medium" style={{ color: "var(--shop-ink)" }}>
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs" style={{ color: "var(--shop-ink-soft)" }}>{user.email}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }
  ```

- [ ] **Step 2: Type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in the new file.

---

## Task 6: QuotePage-ContactStep component

**Files:**
- Create: `src/app/(public)/quote/components/QuotePage-ContactStep.tsx`

- [ ] **Step 1: Create the contact step component**

  Create `src/app/(public)/quote/components/QuotePage-ContactStep.tsx`:

  ```tsx
  "use client"
  import { useState } from "react"
  import { ArrowLeft, ArrowRight, Loader2, UserRound } from "lucide-react"
  import type { Session } from "next-auth"
  import { useAccountPanel } from "@/contexts/AccountPanelContext"
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
    onBack, onSubmit, isPending, submitError,
  }: Props) {
    const { openPanel } = useAccountPanel()
    const [existingUserSelected, setExistingUserSelected] = useState(false)
    const role = session?.user?.role
    const isStaff = role === "admin" || role === "employee"
    const isLoggedIn = !!session && !isStaff

    // When admin picks an existing user, the form collapses — contact fields not required
    const showContactForm = !isStaff || !existingUserSelected
    const contactValid = !!(contact.firstName && contact.lastName && contact.email && contact.phone)
    const consentValid = consent.sms || consent.email || consent.account
    const passwordValid = !consent.account || password.length >= 8
    const canSubmit = (showContactForm ? contactValid : true) && (isStaff || consentValid) && passwordValid && !isPending

    const submitLabel = consent.account && !isStaff ? "Create & send" : "Send quote request"

    function setField(key: keyof ContactState) {
      return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onContactChange({ ...contact, [key]: e.target.value })
    }

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
                className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none text-base"
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
            <QuotePageConsentToggles value={consent} onChange={onConsentChange} />

            {/* Password field — reveals when "Create account" is selected */}
            {consent.account ? (
              <div className="mt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
                  style={{ color: "var(--shop-ink-soft)" }}>
                  Create password *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => onPasswordChange(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm focus:outline-none text-base"
                  style={{ border: "1px solid var(--shop-line)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--shop-blue)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--shop-line)")}
                />
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
            {submitError}
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
  ```

- [ ] **Step 2: Type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in any of the new files.

---

## Task 7: Modify orders route — accept userId + consent fields

**Files:**
- Modify: `src/app/api/orders/route.ts` (function `handlePublicShopQuote`, lines 39–187)

- [ ] **Step 1: Update handlePublicShopQuote to accept and store consent + optional userId**

  Replace the entire `handlePublicShopQuote` function (lines 39–187) with:

  ```ts
  async function handlePublicShopQuote(body: any): Promise<Response> {
    const { pickupDate, dropoffDate, customer, lines, customerNotes, userId: bodyUserId, consentSms, consentEmail } = body

    if (!pickupDate || !dropoffDate) {
      return NextResponse.json({ data: null, error: "pickupDate and dropoffDate are required" }, { status: 400 })
    }
    if (!customer?.firstName || !customer?.lastName || !customer?.email || !customer?.phone) {
      return NextResponse.json({ data: null, error: "customer firstName, lastName, email, and phone are required" }, { status: 400 })
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ data: null, error: "At least one line is required" }, { status: 400 })
    }

    const startDate = parseLocalDate(pickupDate)
    const dueDateEnd = parseLocalDate(dropoffDate)
    if (isNaN(startDate.getTime()) || isNaN(dueDateEnd.getTime()) || startDate >= dueDateEnd) {
      return NextResponse.json({ data: null, error: "Invalid date range — dropoffDate must be after pickupDate" }, { status: 400 })
    }

    for (const line of lines) {
      if (!["item", "tentConfig"].includes(line.kind) || !Number.isInteger(Number(line.refId)) || Number(line.qty) < 1) {
        return NextResponse.json(
          { data: null, error: "Each line requires kind ('item'|'tentConfig'), integer refId, and qty >= 1" },
          { status: 400 },
        )
      }
    }

    // Validate availability before accepting the order
    const validationLines = lines.map((l: any) => ({ kind: l.kind, refId: Number(l.refId), qty: Number(l.qty) }))
    const validation = await validateOrderLines(validationLines, startDate, dueDateEnd)
    if (!validation.ok) {
      return NextResponse.json({
        data: null,
        error: "Some items are no longer available for your dates",
        conflicts: validation.conflicts,
      }, { status: 409 })
    }

    // Look up prices from DB — never trust client-sent prices
    const itemRefIds = lines.filter((l: any) => l.kind === "item").map((l: any) => Number(l.refId))
    const configRefIds = lines.filter((l: any) => l.kind === "tentConfig").map((l: any) => Number(l.refId))

    const [dbItems, dbConfigs] = await Promise.all([
      itemRefIds.length
        ? prisma.item.findMany({ where: { id: { in: itemRefIds } }, select: { id: true, name: true, flatPrice: true } })
        : Promise.resolve([]),
      configRefIds.length
        ? prisma.tentConfiguration.findMany({ where: { id: { in: configRefIds } }, select: { id: true, name: true, flatPrice: true } })
        : Promise.resolve([]),
    ])

    const itemMap = new Map(dbItems.map((i) => [i.id, i]))
    const configMap = new Map(dbConfigs.map((c) => [c.id, c]))

    const missing = lines.find((l: any) =>
      l.kind === "item" ? !itemMap.has(Number(l.refId)) : !configMap.has(Number(l.refId))
    )
    if (missing) {
      return NextResponse.json({ data: null, error: `${missing.kind} ${missing.refId} not found` }, { status: 400 })
    }

    const lineItemRows = lines.map((line: any, idx: number) => {
      const ref = line.kind === "item" ? itemMap.get(Number(line.refId)) : configMap.get(Number(line.refId))
      const unitPrice = Number(ref!.flatPrice)
      const warn = validation.warnings.find((w) => w.kind === line.kind && w.refId === Number(line.refId))
      return {
        description: ref!.name,
        qty: Number(line.qty),
        unitPrice,
        lineTotal: Number(line.qty) * unitPrice,
        unitCost: 0,
        sortOrder: idx,
        notes: line.notes ?? null,
        availabilityWarning: warn ? `Low stock: ${warn.available} available for these dates` : null,
        ...(line.kind === "item" ? { itemId: Number(line.refId) } : { tentConfigId: Number(line.refId) }),
      }
    })

    // Resolve which user to link the order to
    let linkedUserId: string
    if (bodyUserId) {
      // Admin selected an existing user — verify they exist
      const existingUser = await prisma.user.findUnique({ where: { id: bodyUserId }, select: { id: true } })
      if (!existingUser) {
        return NextResponse.json({ data: null, error: "Selected user not found" }, { status: 400 })
      }
      linkedUserId = existingUser.id
    } else {
      // Upsert a guest/user record by email so contact info lives in the system
      const guestUser = await prisma.user.upsert({
        where: { email: customer.email.toLowerCase() },
        update: {},
        create: {
          email: customer.email.toLowerCase(),
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          role: "user",
          password: "__guest__",
        },
        select: { id: true },
      })
      linkedUserId = guestUser.id
    }

    const taxSetting = await prisma.universalSettings.findUnique({ where: { setting: "taxRate" } })
    const taxRate = taxSetting ? Number(taxSetting.value) : 0
    const totals = computeOrderTotals({ lineItems: lineItemRows, setUpCosts: [], taxRate })

    const order = await prisma.order.create({
      data: {
        state: { connect: { id: 1 } },
        user: { connect: { id: linkedUserId } },
        startDate,
        dueDateEnd,
        customerNotes: customerNotes ?? null,
        token: generateToken(),
        createdBy: customer.email,
        consentSms: consentSms === true,
        consentEmail: consentEmail === true,
        ...totals,
        orderLineItems: { create: lineItemRows },
      },
      select: { id: true, token: true },
    })

    // Notify all admins on public submission (DB notification + optional SMS)
    const admins = await prisma.user.findMany({ where: { role: "admin" }, select: { id: true } })
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          orderId: order.id,
          type: "order_submitted",
          title: "New Quote Request",
          message: `A new quote request (#${order.id}) was submitted via the shop.`,
          actionUrl: `/dashboard`,
        })),
      }).catch(() => {})
    }

    // SMS — fire-and-forget, never block the response
    const ns = await prisma.notificationSettings.findUnique({ where: { id: 1 } })
    const customerName = `${customer.firstName} ${customer.lastName}`.trim()
    if (ns?.smsEnabled && ns.onNewOrder && ns.smsPhone) {
      sendSms(
        ns.smsPhone,
        `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
      ).catch(() => {})
    }
    // Email — fire-and-forget
    const emailRecipients = parseEmailRecipients(ns?.emailRecipients)
    if (ns?.emailEnabled && ns.onNewOrder && emailRecipients.length > 0) {
      sendEmail(
        emailRecipients,
        `New Quote Request #${order.id}`,
        `New quote request #${order.id} from ${customerName}. Open dashboard to review.`,
      ).catch(() => {})
    }

    return NextResponse.json({ data: { id: order.id, token: order.token }, error: null }, { status: 201 })
  }
  ```

- [ ] **Step 2: Type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors in `route.ts`. If Prisma complains about `consentSms`/`consentEmail` not existing, make sure Task 1 (migration + `prisma generate`) was completed first.

---

## Task 8: Update QuotePage.tsx — add session, state, wire up new component

**Files:**
- Modify: `src/app/(public)/quote/QuotePage.tsx`

- [ ] **Step 1: Update imports**

  Replace the current import block at the top of `QuotePage.tsx` with:

  ```tsx
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
  ```

  Note: `ArrowLeft` is removed from the import since it's now inside `QuotePage-ContactStep`.

- [ ] **Step 2: Add session and consent state to the QuotePage component body**

  Inside the `QuotePage` function, after the existing `const { lines, updateLine, removeLine, clearCart } = useCart()` line, add:

  ```tsx
  const { data: session } = useSession()
  const [consent, setConsent] = useState<ConsentValue>({ sms: false, email: false, account: false })
  const [password, setPassword] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  ```

- [ ] **Step 3: Add pre-fill effect for logged-in users**

  After the existing `imageMap` effect (around line 86), add:

  ```tsx
  // Pre-fill contact form from session when a regular user is logged in
  useEffect(() => {
    if (!session?.user) return
    const role = session.user.role
    if (role === "admin" || role === "employee") return
    setContact(prev => ({
      ...prev,
      firstName: session.user.firstName || prev.firstName,
      lastName: session.user.lastName || prev.lastName,
      email: session.user.email || prev.email,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])
  ```

- [ ] **Step 4: Replace handleSubmit with the auth-aware version**

  Replace the entire `handleSubmit` function with:

  ```tsx
  const handleSubmit = () => {
    if (!start || !end) return

    startTransition(async () => {
      setSubmitError(null)

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
      setOrderId(json.data?.id ?? null)
      clearCart()
      setStep("confirm")
    })
  }
  ```

- [ ] **Step 5: Replace the inline contact step JSX with the new component**

  Find the `{/* Contact step */}` block (currently lines 294–351) and replace it entirely with:

  ```tsx
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
      isPending={isPending}
      submitError={submitError}
    />
  ) : null}
  ```

  Also remove the now-unused `submitError` state display that was inside the old contact block (it's now rendered inside `QuotePageContactStep`). The `submitError` state variable in `QuotePage.tsx` stays — it's passed as a prop.

- [ ] **Step 6: Remove ArrowLeft import if still present**

  If `ArrowLeft` was not removed in Step 1, remove it now. It is no longer used in `QuotePage.tsx` directly.

- [ ] **Step 7: Full type check**

  ```bash
  npx tsc --noEmit
  ```

  Expected: zero errors. Common issues to watch for:
  - `session?.user?.id` — confirm `id` is in the session type (it is, in `src/types/next-auth.d.ts`)
  - `ContactState` type must match between `QuotePage.tsx` and `QuotePage-ContactStep.tsx` — they share the same exported type
  - `ConsentValue` imported from `./components/QuotePage-ConsentToggles`

---

## Task 9: Manual verification

- [ ] **Step 1: Start the dev server**

  ```bash
  npm run dev
  ```

- [ ] **Step 2: Verify anonymous flow**

  1. Open `http://localhost:3000/quote` in an incognito window (no session)
  2. Add an item, pick dates, click "Continue to contact info"
  3. Verify: "Have an account? Sign in to auto-fill" pill is visible above the form
  4. Click the pill — verify the navbar account panel opens
  5. Fill out the contact form
  6. Verify consent toggles appear below: Text / Email / Save my info (pill on desktop, toggle rows on mobile — resize to verify)
  7. Try to click "Send quote request" without selecting any consent toggle — verify button is disabled
  8. Toggle "Text" — verify SMS disclosure appears below
  9. Toggle "Save my info" — verify password field slides in, button label changes to "Create & send"
  10. Enter a valid email, name, phone, and 8+ char password, select "Email" consent, submit
  11. Verify confirmation step shows "Quote on the way."

- [ ] **Step 3: Verify logged-in user flow**

  1. Sign in as a regular user
  2. Go to `/quote`, add item, pick dates, continue to contact
  3. Verify form pre-fills with name and email from session
  4. Verify "Sign in" pill is NOT shown
  5. Verify consent section is shown
  6. Submit — verify success

- [ ] **Step 4: Verify admin flow**

  1. Sign in as admin
  2. Go to `/quote`, add item, pick dates, continue to contact
  3. Verify the customer combobox appears at the top (defaulting to placeholder "New guest / customer")
  4. Type a name in the combobox — verify results appear from the search API
  5. Select a user — verify the form fields remain editable (they're for the order info, not the customer identity)
  6. Verify consent section is NOT shown
  7. Submit with "New guest / customer" (no user selected) — verify success
  8. Repeat with an existing user selected — verify success

- [ ] **Step 5: Verify the navbar account panel still works normally**

  Open the account icon in the header, sign in/out — confirm the panel still opens and closes correctly from the header button.
