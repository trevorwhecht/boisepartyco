"use client"
import { MessageSquare, Mail, UserPlus } from "lucide-react"

export interface ConsentValue {
  sms: boolean
  email: boolean
  account: boolean
}

const ALL_OPTIONS = [
  { key: "sms" as const, label: "Text", Icon: MessageSquare },
  { key: "email" as const, label: "Email", Icon: Mail },
  { key: "account" as const, label: "An Account", Icon: UserPlus },
]

interface Props {
  value: ConsentValue
  onChange: (v: ConsentValue) => void
  hideAccount?: boolean
}

export default function QuotePageConsentToggles({ value, onChange, hideAccount }: Props) {
  const options = hideAccount ? ALL_OPTIONS.filter(o => o.key !== "account") : ALL_OPTIONS

  function toggle(key: keyof ConsentValue) {
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-(--shop-ink-soft) mb-2">
        Notify me via{" "}
        {!hideAccount ? (
          <span className="text-(--color-danger) normal-case tracking-normal font-normal">
            (choose at least one)
          </span>
        ) : (
          <span className="normal-case tracking-normal font-normal text-(--shop-ink-soft)">
            (optional)
          </span>
        )}
      </div>

      {/* Desktop: pill toggles (md+) */}
      <div className="hidden md:flex gap-2 flex-wrap">
        {options.map(({ key, label, Icon }) => (
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
        {options.map(({ key, label, Icon }) => (
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
