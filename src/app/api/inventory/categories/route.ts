// src/app/api/inventory/categories/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      isSerialized: true,
      sortOrder: true,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  })
  return NextResponse.json({ data: categories, error: null })
}
