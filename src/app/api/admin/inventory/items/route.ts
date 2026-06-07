import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  if (!categoryId) return NextResponse.json({ data: null, error: "categoryId is required" }, { status: 400 })

  const id = parseInt(categoryId, 10)
  if (isNaN(id)) return NextResponse.json({ data: null, error: "Invalid categoryId" }, { status: 400 })

  const items = await prisma.item.findMany({
    where: { categoryId: id },
    select: { id: true, sku: true, slug: true, name: true, qty: true, isActive: true, primaryImageUrl: true, sortOrder: true, flatPrice: true, pricingMode: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({
    data: items.map(item => ({ ...item, flatPrice: item.flatPrice.toNumber() })),
    error: null,
  })
}
