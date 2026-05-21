import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid id" }, { status: 400 })

  const body = await req.json()
  const { qty, isActive, primaryImageUrl } = body

  if (qty !== undefined && (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0)) {
    return NextResponse.json({ data: null, error: "qty must be a non-negative integer" }, { status: 400 })
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...(qty !== undefined ? { qty } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(primaryImageUrl !== undefined ? { primaryImageUrl: primaryImageUrl || null } : {}),
    },
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true },
  })

  return NextResponse.json({ data: item, error: null })
}
