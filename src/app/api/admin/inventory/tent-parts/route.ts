import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  // Tent parts are admin-only (employees see configs but not the parts table)
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const parts = await prisma.tentPart.findMany({
    select: { id: true, name: true, partType: true, qty: true, isSerialized: true, isActive: true },
    orderBy: [{ partType: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ data: parts, error: null })
}
