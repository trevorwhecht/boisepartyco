import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Orders from "./Orders"

export default async function OrdersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?redirect=/account/orders")

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id, stateId: { not: 0 } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      nickname: true,
      stateId: true,
      state: { select: { name: true, color: true } },
      startDate: true,
      endDate: true,
      guests: true,
      totalPrice: true,
      mainImage: true,
      paymentPlan: true,
      subTotal: true,
      salesTax: true,
      discountManual: true,
      customerNotes: true,
      createdAt: true,
      orderLineItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          description: true,
          qty: true,
          unitPrice: true,
          lineTotal: true,
          notes: true,
          item: { select: { primaryImageUrl: true } },
          tentConfig: { select: { primaryImageUrl: true } },
        },
      },
      setUpCosts: {
        select: { id: true, userTotal: true, customSetupItems: true },
      },
      payments: {
        select: { id: true, amount: true },
      },
    },
  })

  return <Orders orders={orders} />
}
