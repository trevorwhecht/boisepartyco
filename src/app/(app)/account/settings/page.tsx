import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Settings from "./Settings"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?redirect=/account/settings")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      companyName: true,
      consentSms: true,
      consentEmail: true,
      addresses: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: { id: true, street: true, city: true, state: true, zipCode: true },
      },
    },
  })

  if (!user) redirect("/login")

  return <Settings user={user} />
}
