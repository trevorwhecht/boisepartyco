import SettingsProfile from "./components/Settings-Profile"
import SettingsNotifications from "./components/Settings-Notifications"

type Address = {
  id: string
  street: string
  city: string
  state: string
  zipCode: string
} | null

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  companyName: string | null
  consentSms: boolean
  consentEmail: boolean
  addresses: Array<{ id: string; street: string; city: string; state: string; zipCode: string }>
}

type Props = { user: User }

export default function Settings({ user }: Props) {
  const address: Address = user.addresses[0] ?? null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-(--color-foreground)">Account Settings</h1>
      <SettingsProfile
        user={{
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          companyName: user.companyName,
        }}
        address={address}
      />
      <SettingsNotifications initialSms={user.consentSms} initialEmail={user.consentEmail} />
    </div>
  )
}
