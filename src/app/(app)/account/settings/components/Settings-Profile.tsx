"use client"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Address = {
  id: string
  street: string
  city: string
  state: string
  zipCode: string
} | null

type Props = {
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    companyName: string | null
  }
  address: Address
}

export default function SettingsProfile({ user, address }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isPwPending, startPwTransition] = useTransition()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const street = (form.get("street") as string).trim()

    const body: Record<string, any> = {
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || null,
      companyName: (form.get("companyName") as string) || null,
    }

    if (street) {
      body.address = {
        id: address?.id,
        street,
        city: form.get("city") as string,
        state: form.get("state") as string,
        zipCode: form.get("zipCode") as string,
      }
    }

    startTransition(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      toast.success("Profile saved.")
    })
  }

  function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwError(null)
    const form = new FormData(e.currentTarget)
    const password = form.get("password") as string
    const confirm = form.get("confirm") as string
    if (password !== confirm) { setPwError("Passwords do not match."); return }
    if (password.length < 8) { setPwError("Password must be at least 8 characters."); return }

    startPwTransition(async () => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (json.error) { setPwError(json.error); return }
      toast.success("Password updated.")
      setShowPasswordDialog(false)
    })
  }

  return (
    <div className="rounded-lg border border-(--color-border) bg-(--color-background) p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-(--color-foreground)">Profile</h2>
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => { setPwError(null); setShowPasswordDialog(true) }}
        >
          Change Password
        </Button>
      </div>

      <form onSubmit={handleProfileSave} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" id="sp-firstName">
            <Input
              id="sp-firstName"
              name="firstName"
              defaultValue={user.firstName}
              required
              autoComplete="given-name"
              className="text-base"
            />
          </Field>
          <Field label="Last Name" id="sp-lastName">
            <Input
              id="sp-lastName"
              name="lastName"
              defaultValue={user.lastName}
              required
              autoComplete="family-name"
              className="text-base"
            />
          </Field>
        </div>

        <Field label="Email" id="sp-email">
          <Input
            id="sp-email"
            name="email"
            type="email"
            inputMode="email"
            defaultValue={user.email}
            required
            autoComplete="email"
            className="text-base"
          />
        </Field>

        <Field label="Phone" id="sp-phone">
          <Input
            id="sp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={user.phone ?? ""}
            autoComplete="tel"
            className="text-base"
          />
        </Field>

        <Field label="Company (optional)" id="sp-company">
          <Input
            id="sp-company"
            name="companyName"
            defaultValue={user.companyName ?? ""}
            autoComplete="organization"
            className="text-base"
          />
        </Field>

        <div className="pt-2 border-t border-(--color-border) space-y-3">
          <p className="text-sm font-medium text-(--color-foreground)">
            {address ? "Address" : "Address (optional)"}
          </p>
          <Field label="Street" id="sp-street">
            <Input
              id="sp-street"
              name="street"
              defaultValue={address?.street ?? ""}
              autoComplete="street-address"
              className="text-base"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" id="sp-city">
              <Input
                id="sp-city"
                name="city"
                defaultValue={address?.city ?? ""}
                autoComplete="address-level2"
                className="text-base"
              />
            </Field>
            <Field label="State" id="sp-state">
              <Input
                id="sp-state"
                name="state"
                defaultValue={address?.state ?? ""}
                autoComplete="address-level1"
                className="text-base"
              />
            </Field>
          </div>
          <Field label="Zip Code" id="sp-zip">
            <Input
              id="sp-zip"
              name="zipCode"
              inputMode="numeric"
              defaultValue={address?.zipCode ?? ""}
              autoComplete="postal-code"
              className="text-base"
            />
          </Field>
        </div>

        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-(--color-background)">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetPassword} className="space-y-3">
            <Field label="New Password" id="sp-pw">
              <div className="relative">
                <Input
                  id="sp-pw"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="text-base pr-10"
                />
                <EyeToggle show={showPassword} onToggle={() => setShowPassword(p => !p)} />
              </div>
            </Field>
            <Field label="Confirm Password" id="sp-pw-confirm">
              <div className="relative">
                <Input
                  id="sp-pw-confirm"
                  name="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="text-base pr-10"
                />
                <EyeToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(p => !p)} />
              </div>
            </Field>
            {pwError ? (
              <p className="text-sm text-(--color-danger)" role="alert">
                {pwError}
              </p>
            ) : null}
            <DialogFooter className="pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button variant="outline" type="button" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button autoFocus type="submit" disabled={isPwPending} className="gap-2">
                {isPwPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPwPending ? "Saving…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-muted) hover:text-(--color-foreground)"
      aria-label={show ? "Hide password" : "Show password"}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}
