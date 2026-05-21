import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const rows: { id: number; qty: number }[] = body.rows ?? []

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ data: null, error: "No rows to import" }, { status: 400 })
  }

  let updated = 0
  const errors: string[] = []

  for (const row of rows) {
    try {
      await prisma.item.update({ where: { id: row.id }, data: { qty: row.qty } })
      updated++
    } catch {
      errors.push(`id ${row.id}: not found or update failed`)
    }
  }

  return NextResponse.json({ data: { updated, errors }, error: null })
}
