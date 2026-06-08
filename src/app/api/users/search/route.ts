import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  const role = session.user.role
  if (role !== "admin" && role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10) || 0)
  const take = Math.min(50, Math.max(1, parseInt(searchParams.get("take") ?? "15", 10) || 15))

  const users = await prisma.user.findMany({
    where: q ? {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    } : {},
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { createdAt: "desc" },
    skip,
    take: take + 1, // fetch one extra to know if there are more
  })

  const hasMore = users.length > take
  return NextResponse.json({ data: users.slice(0, take), error: null, hasMore })
}
