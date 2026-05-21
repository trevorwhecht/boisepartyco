import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ data: categories, error: null })
}
