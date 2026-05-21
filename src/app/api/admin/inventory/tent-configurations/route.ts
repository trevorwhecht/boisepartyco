import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTentConfigBuildableCount } from "@/services/inventoryService"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ data: null, error: "Forbidden" }, { status: 403 })
  }

  const configs = await prisma.tentConfiguration.findMany({
    select: { id: true, name: true, widthFt: true, lengthFt: true, isActive: true, bomComplete: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  })

  const data = await Promise.all(
    configs.map(async (config) => {
      const buildable = await getTentConfigBuildableCount(config.id)
      return { ...config, ...buildable }
    }),
  )

  return NextResponse.json({ data, error: null })
}
