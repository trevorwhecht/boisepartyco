import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 })

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          isRead: true,
          actionUrl: true,
          orderId: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ])

    return NextResponse.json({ data: { notifications, unreadCount }, error: null })
  } catch (error) {
    console.error("GET /api/notifications:", error)
    return NextResponse.json(
      { data: null, error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })

    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 })

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ data: { updated: result.count }, error: null })
  } catch (error) {
    console.error("PATCH /api/notifications:", error)
    return NextResponse.json(
      { data: null, error: "Failed to update notifications" },
      { status: 500 }
    )
  }
}
