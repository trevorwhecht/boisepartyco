"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useSession } from "next-auth/react"
import DashboardSettingsViewSetupFeePresets from "./Dashboard-SettingsView-SetupFeePresets"
import DashboardSettingsViewOrderStates from "./Dashboard-SettingsView-OrderStates"

type Access = "none" | "view" | "edit"

type NotifSettings = {
  smsEnabled: boolean
  smsPhone: string | null
  onNewOrder: boolean
  onStateChange: boolean
  onPayment: boolean
}

const ACCESS_KEYS = [
  { key: "employeeLineItemPriceAccess", label: "Line Item Price", description: "Whether employees can see / edit the unit price on order line items" },
  { key: "employeeLineItemCostAccess", label: "Line Item Cost", description: "Whether employees can see / edit the unit cost on order line items" },
  { key: "employeeSetupCostAccess", label: "Setup Cost (Cost Column)", description: "Whether employees can see / edit the internal cost on setup cost rows" },
] as const

export default function DashboardSettingsView() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "admin"

  const [permissions, setPermissions] = useState<Record<string, Access>>({
    employeeLineItemPriceAccess: "view",
    employeeLineItemCostAccess: "none",
    employeeSetupCostAccess: "edit",
  })
  const [isPending, startTransition] = useTransition()

  // Notification settings state
  const [notif, setNotif] = useState<NotifSettings>({
    smsEnabled: false,
    smsPhone: null,
    onNewOrder: true,
    onStateChange: true,
    onPayment: true,
  })
  const [notifPending, startNotifTransition] = useTransition()
  const [phoneInput, setPhoneInput] = useState("")

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        setPermissions((prev) => {
          const next = { ...prev }
          for (const item of data) {
            if (item.setting in next) next[item.setting] = item.value as Access
          }
          return next
        })
      })
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    fetch("/api/admin/notification-settings")
      .then((r) => r.json())
      .then(({ data }) => {
        if (!data) return
        setNotif({
          smsEnabled: data.smsEnabled,
          smsPhone: data.smsPhone,
          onNewOrder: data.onNewOrder,
          onStateChange: data.onStateChange,
          onPayment: data.onPayment,
        })
        setPhoneInput(data.smsPhone ?? "")
      })
  }, [isAdmin])

  function handleAccessChange(key: string, value: Access) {
    const prev = permissions[key]
    setPermissions((p) => ({ ...p, [key]: value }))
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting: key, value }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        setPermissions((p) => ({ ...p, [key]: prev as Access }))
      }
    })
  }

  function patchNotif(patch: Partial<NotifSettings>) {
    const prev = notif
    setNotif((p) => ({ ...p, ...patch }))
    startNotifTransition(async () => {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        setNotif(prev)
      }
    })
  }

  function handlePhoneBlur() {
    const trimmed = phoneInput.trim()
    if (trimmed === (notif.smsPhone ?? "")) return // no change
    patchNotif({ smsPhone: trimmed || null })
  }

  return (
    <div className="p-6 max-w-4xl space-y-10">
      <h2 className="text-xl font-semibold text-(--color-foreground)">Settings</h2>
      <DashboardSettingsViewSetupFeePresets />
      <DashboardSettingsViewOrderStates />

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-(--color-foreground)">Employee Permissions</h3>
          <p className="text-sm text-(--color-muted) mt-0.5">Control what employees can see and edit in the quote builder.</p>
        </div>
        <div className="rounded-lg border border-(--color-border) overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--color-border) bg-(--color-surface)">
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Field</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Description</th>
                <th className="text-left px-4 py-2.5 font-medium text-(--color-muted) w-36">Access</th>
              </tr>
            </thead>
            <tbody>
              {ACCESS_KEYS.map(({ key, label, description }) => (
                <tr key={key} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3 font-medium text-(--color-foreground) whitespace-nowrap">{label}</td>
                  <td className="px-4 py-3 text-(--color-muted) text-xs">{description}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={permissions[key] ?? "none"}
                      onValueChange={(v) => handleAccessChange(key, v as Access)}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-28 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-(--color-background)">
                        <SelectItem value="none">Hidden</SelectItem>
                        <SelectItem value="view">View Only</SelectItem>
                        <SelectItem value="edit">Editable</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-(--color-muted)">
          <strong>Hidden</strong> — field stripped from API response and not shown in UI. &nbsp;
          <strong>View Only</strong> — visible but read-only. &nbsp;
          <strong>Editable</strong> — fully editable.
        </p>
      </div>

      {isAdmin ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-(--color-foreground)">Notifications</h3>
            <p className="text-sm text-(--color-muted) mt-0.5">
              SMS alerts sent to a single phone number when key events occur.
            </p>
          </div>

          {/* SMS toggle + phone */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
              <div>
                <p className="text-sm font-medium text-(--color-foreground)">SMS Notifications</p>
                <p className="text-xs text-(--color-muted)">Send a text message when events occur</p>
              </div>
              <Switch
                checked={notif.smsEnabled}
                onCheckedChange={(checked) => patchNotif({ smsEnabled: checked })}
                disabled={notifPending}
              />
            </div>
            <div className="px-4 py-3">
              <Label htmlFor="notif-phone" className="text-xs uppercase tracking-wide text-(--color-muted)">
                Send SMS to this number
              </Label>
              <Input
                id="notif-phone"
                type="tel"
                inputMode="tel"
                placeholder="+12085551234"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={handlePhoneBlur}
                disabled={notifPending}
                className="mt-1.5 text-base max-w-xs"
              />
              <p className="text-xs text-(--color-muted) mt-1">E.164 format — e.g. +12085551234</p>
            </div>
          </div>

          {/* Event toggles */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden divide-y divide-(--color-border)">
            {[
              { key: "onNewOrder" as const, label: "New public quote", description: "Customer submits a quote request via the shop" },
              { key: "onStateChange" as const, label: "Order state change", description: "An order is moved to a new status" },
              { key: "onPayment" as const, label: "Payment recorded", description: "A payment is logged on an order" },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-(--color-foreground)">{label}</p>
                  <p className="text-xs text-(--color-muted)">{description}</p>
                </div>
                <Switch
                  checked={notif[key]}
                  onCheckedChange={(checked) => patchNotif({ [key]: checked })}
                  disabled={notifPending || !notif.smsEnabled}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-(--color-muted)">
            Event toggles are disabled when SMS notifications are off.
          </p>
        </div>
      ) : null}
    </div>
  )
}
