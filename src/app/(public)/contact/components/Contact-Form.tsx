"use client"
import { useState, useTransition, useRef } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const LABEL = "block text-[11px] font-semibold uppercase tracking-widest text-(--shop-ink-soft) mb-1.5"
const INPUT = "w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-base focus:outline-none focus:border-(--shop-blue)"

type Fields = {
  firstName: string
  lastName: string
  email: string
  phone: string
  eventAddress: string
  eventDate: string
  message: string
}

type Errors = Partial<Record<keyof Fields, string>>

export default function ContactForm() {
  const [isPending, startTransition] = useTransition()
  const [dateConfirmed, setDateConfirmed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [fields, setFields] = useState<Fields>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    eventAddress: "",
    eventDate: "",
    message: "",
  })

  const firstNameRef = useRef<HTMLInputElement>(null)
  const lastNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const eventAddressRef = useRef<HTMLInputElement>(null)
  const eventDateRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const refs = {
    firstName: firstNameRef,
    lastName: lastNameRef,
    email: emailRef,
    phone: phoneRef,
    eventAddress: eventAddressRef,
    eventDate: eventDateRef,
    message: messageRef,
  }

  function set(key: keyof Fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!fields.firstName.trim()) e.firstName = "First name is required."
    if (!fields.lastName.trim()) e.lastName = "Last name is required."
    if (!fields.email.trim()) {
      e.email = "Email is required."
    } else if (!fields.email.includes("@")) {
      e.email = "Enter a valid email address."
    }
    if (!fields.phone.trim()) e.phone = "Phone is required."
    if (!fields.eventAddress.trim()) e.eventAddress = "Event address is required."
    if (dateConfirmed && !fields.eventDate) e.eventDate = "Event date is required."
    if (!dateConfirmed && !fields.message.trim()) e.message = "Message is required."
    return e
  }

  function focusFirstError(e: Errors) {
    const order: (keyof Fields)[] = ["firstName", "lastName", "email", "phone", "eventDate", "eventAddress", "message"]
    for (const key of order) {
      if (e[key]) {
        const el = refs[key].current as HTMLElement | null
        el?.focus()
        break
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      focusFirstError(errs)
      return
    }
    startTransition(async () => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${fields.firstName.trim()} ${fields.lastName.trim()}`,
          email: fields.email,
          phone: fields.phone,
          dateConfirmed,
          eventDate: dateConfirmed ? fields.eventDate : undefined,
          eventAddress: fields.eventAddress,
          message: fields.message,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        toast.error(json.error ?? "Something went wrong. Please try again.")
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg font-medium text-(--shop-ink)">Thanks! We&rsquo;ll be in touch shortly.</p>
      </div>
    )
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>

      {/* First + Last Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-first-name" className={LABEL}>First Name</label>
          <input
            ref={firstNameRef}
            id="cf-first-name"
            type="text"
            value={fields.firstName}
            onChange={e => set("firstName", e.target.value)}
            autoComplete="given-name"
            inputMode="text"
            className={INPUT}
          />
          {errors.firstName ? (
            <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.firstName}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="cf-last-name" className={LABEL}>Last Name</label>
          <input
            ref={lastNameRef}
            id="cf-last-name"
            type="text"
            value={fields.lastName}
            onChange={e => set("lastName", e.target.value)}
            autoComplete="family-name"
            inputMode="text"
            className={INPUT}
          />
          {errors.lastName ? (
            <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.lastName}</p>
          ) : null}
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cf-email" className={LABEL}>Email</label>
          <input
            ref={emailRef}
            id="cf-email"
            type="email"
            value={fields.email}
            onChange={e => set("email", e.target.value)}
            autoComplete="email"
            inputMode="email"
            className={INPUT}
          />
          {errors.email ? (
            <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.email}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="cf-phone" className={LABEL}>Phone</label>
          <input
            ref={phoneRef}
            id="cf-phone"
            type="tel"
            value={fields.phone}
            onChange={e => set("phone", e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            className={INPUT}
          />
          {errors.phone ? (
            <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.phone}</p>
          ) : null}
        </div>
      </div>

      {/* Is a Date Confirmed? Yes/No toggle */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-(--shop-ink-soft)">
          Is a Date Confirmed?
        </span>
        <div className="flex rounded-lg border border-(--shop-line) overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => {
              setDateConfirmed(false)
              setErrors(prev => ({ ...prev, eventDate: undefined }))
            }}
            className={`px-4 py-2 font-medium transition-colors ${!dateConfirmed ? "bg-(--shop-blue) text-white" : "text-(--shop-ink-soft) hover:bg-(--shop-paper)"}`}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => {
              setDateConfirmed(true)
              setErrors(prev => ({ ...prev, message: undefined }))
            }}
            className={`px-4 py-2 font-medium transition-colors ${dateConfirmed ? "bg-(--shop-blue) text-white" : "text-(--shop-ink-soft) hover:bg-(--shop-paper)"}`}
          >
            Yes
          </button>
        </div>
      </div>

      {/* Event Date — visible when date confirmed */}
      {dateConfirmed ? (
        <div>
          <label htmlFor="cf-event-date" className={LABEL}>Event Date</label>
          <input
            ref={eventDateRef}
            id="cf-event-date"
            type="date"
            value={fields.eventDate}
            onChange={e => set("eventDate", e.target.value)}
            className={INPUT}
          />
          {errors.eventDate ? (
            <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.eventDate}</p>
          ) : null}
        </div>
      ) : null}

      {/* Event Address */}
      <div>
        <label htmlFor="cf-event-address" className={LABEL}>Event Address</label>
        <input
          ref={eventAddressRef}
          id="cf-event-address"
          type="text"
          value={fields.eventAddress}
          onChange={e => set("eventAddress", e.target.value)}
          autoComplete="street-address"
          inputMode="text"
          className={INPUT}
        />
        {errors.eventAddress ? (
          <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.eventAddress}</p>
        ) : null}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="cf-message" className={LABEL}>
          {dateConfirmed ? "Message (optional)" : "Message"}
        </label>
        <textarea
          ref={messageRef}
          id="cf-message"
          value={fields.message}
          onChange={e => set("message", e.target.value)}
          rows={4}
          className="w-full px-3.5 py-2.5 border border-(--shop-line) rounded-lg text-base focus:outline-none focus:border-(--shop-blue) resize-y"
        />
        {errors.message ? (
          <p role="alert" className="mt-1 text-xs text-(--shop-warn)">{errors.message}</p>
        ) : null}
      </div>

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-3 rounded-full text-sm font-semibold text-white gap-2 inline-flex items-center bg-(--shop-blue)"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  )
}
