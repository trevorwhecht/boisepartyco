"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useSession } from "next-auth/react"
// import DashboardSettingsViewSetupFeePresets from "./Dashboard-SettingsView-SetupFeePresets"
// import DashboardSettingsViewOrderStates from "./Dashboard-SettingsView-OrderStates"

type Access = "none" | "view" | "edit"
type InventoryModeValue = "on" | "off" | "fully_in_stock"

type NotifSettings = {
  smsEnabled: boolean
  smsPhone: string | null
  emailEnabled: boolean
  emailRecipients: string | null
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

  const [inventoryMode, setInventoryMode] = useState<InventoryModeValue>("on")
  const [inventoryModePending, startInventoryModeTransition] = useTransition()

  // Notification settings state
  const [notif, setNotif] = useState<NotifSettings>({
    smsEnabled: false,
    smsPhone: null,
    emailEnabled: false,
    emailRecipients: null,
    onNewOrder: true,
    onStateChange: true,
    onPayment: true,
  })
  const [notifPending, startNotifTransition] = useTransition()
  const [phoneInput, setPhoneInput] = useState("")
  const [emailRecipientsInput, setEmailRecipientsInput] = useState("")
  const [smsConsentChecked, setSmsConsentChecked] = useState(false)

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
        const invRow = data.find((item: any) => item.setting === "inventoryMode")
        if (invRow) setInventoryMode(invRow.value as InventoryModeValue)
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
          emailEnabled: data.emailEnabled,
          emailRecipients: data.emailRecipients,
          onNewOrder: data.onNewOrder,
          onStateChange: data.onStateChange,
          onPayment: data.onPayment,
        })
        setPhoneInput(data.smsPhone ?? "")
        setEmailRecipientsInput(data.emailRecipients ?? "")
        if (data.smsEnabled) setSmsConsentChecked(true)
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

  function handleInventoryModeChange(value: InventoryModeValue) {
    const prev = inventoryMode
    setInventoryMode(value)
    startInventoryModeTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setting: "inventoryMode", value }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error)
        setInventoryMode(prev)
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

  function handleEmailRecipientsBlur() {
    const trimmed = emailRecipientsInput.trim()
    if (trimmed === (notif.emailRecipients ?? "")) return // no change
    patchNotif({ emailRecipients: trimmed || null })
  }

  return (
    <div className="p-6 max-w-4xl space-y-10">
      <h2 className="text-xl font-semibold text-(--color-foreground)">Settings</h2>
      {/* <DashboardSettingsViewSetupFeePresets /> */}
      {/* <DashboardSettingsViewOrderStates /> */}

      {/* Inventory Mode */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-(--color-foreground)">Inventory</h3>
          <p className="text-sm text-(--color-muted) mt-0.5">Control how the public shop handles availability.</p>
        </div>
        <div className="rounded-lg border border-(--color-border) overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-(--color-foreground)">Inventory Mode</p>
              <p className="text-xs text-(--color-muted) mt-0.5">
                {inventoryMode === "on" && "Showing real availability from your database"}
                {inventoryMode === "off" && "Booking UI replaced with a Contact Us prompt"}
                {inventoryMode === "fully_in_stock" && "Everything treated as fully available"}
              </p>
            </div>
            <Select
              value={inventoryMode}
              onValueChange={(v) => handleInventoryModeChange(v as InventoryModeValue)}
              disabled={inventoryModePending}
            >
              <SelectTrigger className="w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-(--color-background)">
                <SelectItem value="fully_in_stock">Fully In Stock</SelectItem>
                <SelectItem value="on">Live Inventory</SelectItem>
                <SelectItem value="off">Contact Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-(--color-foreground)">Notifications</h3>
            <p className="text-sm text-(--color-muted) mt-0.5">
              Configure SMS and email alerts sent when key events occur.
            </p>
          </div>

          {/* Channel config: SMS + Email side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* SMS */}
            <div className="rounded-lg border border-(--color-border) overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
                <div>
                  <p className="text-sm font-medium text-(--color-foreground)">Text (SMS)</p>
                  <p className="text-xs text-(--color-muted)">Send a text when events fire</p>
                </div>
                <Switch
                  checked={notif.smsEnabled}
                  onCheckedChange={(checked) => {
                    if (checked && !smsConsentChecked) {
                      toast.error("Please check the SMS consent box before enabling text notifications.")
                      return
                    }
                    patchNotif({ smsEnabled: checked })
                  }}
                  disabled={notifPending}
                />
              </div>
              <div className="px-4 py-3">
                <Label htmlFor="notif-phone" className="text-xs uppercase tracking-wide text-(--color-muted)">
                  Phone number
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
                  className="mt-1.5 text-base"
                />
                <p className="text-xs text-(--color-muted) mt-1">E.164 format — e.g. +12085551234</p>
                <p className="text-xs text-(--color-muted) mt-3 leading-relaxed">
                  By enabling SMS notifications and saving your phone number, you agree to receive recurring text
                  message order notifications from One With Arts Coding regarding Boise Party Co events and orders.
                  Message frequency varies based on your order activity. Msg &amp; data rates may apply. You can reply
                  STOP at any time to cancel, or reply HELP for assistance. Mobile information will not be shared with
                  third parties or affiliates for marketing purposes. View our{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--color-foreground)">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--color-foreground)">
                    Terms &amp; Conditions
                  </a>.
                </p>
                <label className="flex items-start gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsConsentChecked}
                    onChange={(e) => setSmsConsentChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-(--color-primary) cursor-pointer"
                  />
                  <span className="text-xs text-(--color-muted) leading-snug">
                    I agree to receive SMS order notification messages from One With Arts Coding regarding Boise Party Co.
                  </span>
                </label>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-lg border border-(--color-border) overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
                <div>
                  <p className="text-sm font-medium text-(--color-foreground)">Email</p>
                  <p className="text-xs text-(--color-muted)">Send an email when events fire</p>
                </div>
                <Switch
                  checked={notif.emailEnabled}
                  onCheckedChange={(checked) => patchNotif({ emailEnabled: checked })}
                  disabled={notifPending}
                />
              </div>
              <div className="px-4 py-3">
                <Label htmlFor="notif-email-recipients" className="text-xs uppercase tracking-wide text-(--color-muted)">
                  Recipients
                </Label>
                <Textarea
                  id="notif-email-recipients"
                  placeholder="you@example.com, partner@example.com"
                  value={emailRecipientsInput}
                  onChange={(e) => setEmailRecipientsInput(e.target.value)}
                  onBlur={handleEmailRecipientsBlur}
                  disabled={notifPending}
                  className="mt-1.5 text-base resize-none"
                  rows={3}
                />
                <p className="text-xs text-(--color-muted) mt-1">One per line or comma-separated</p>
              </div>
            </div>
          </div>

          {/* Per-event toggles */}
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--color-border) bg-(--color-surface)">
                  <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Event</th>
                  <th className="text-left px-4 py-2.5 font-medium text-(--color-muted) hidden sm:table-cell">When it fires</th>
                  <th className="text-center px-4 py-2.5 font-medium text-(--color-muted) w-20">Text</th>
                  <th className="text-center px-4 py-2.5 font-medium text-(--color-muted) w-20">Email</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { key: "onNewOrder" as const, label: "New public quote", description: "Customer submits a quote request via the shop" },
                  { key: "onStateChange" as const, label: "Order state change", description: "An order is moved to a new status" },
                  { key: "onPayment" as const, label: "Payment recorded", description: "A payment is logged on an order" },
                ].map(({ key, label, description }) => (
                  <tr key={key} className="border-b border-(--color-border) last:border-0">
                    <td className="px-4 py-3 font-medium text-(--color-foreground) whitespace-nowrap">{label}</td>
                    <td className="px-4 py-3 text-(--color-muted) text-xs hidden sm:table-cell">{description}</td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={notif[key] && notif.smsEnabled}
                        onCheckedChange={(checked) => patchNotif({ [key]: checked })}
                        disabled={notifPending || !notif.smsEnabled}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch
                        checked={notif[key] && notif.emailEnabled}
                        onCheckedChange={(checked) => patchNotif({ [key]: checked })}
                        disabled={notifPending || !notif.emailEnabled}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-(--color-muted)">
            A channel's column is disabled until that channel is turned on above.
          </p>
        </div>
      ) : null}

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
    </div>
  )
}
