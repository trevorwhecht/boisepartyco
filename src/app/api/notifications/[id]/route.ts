import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ data: null, error: "User not found" }, { status: 404 })

    const notification = await prisma.notification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { isRead: true },
    })

    if (notification.count === 0) {
      return NextResponse.json({ data: null, error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ data: { updated: notification.count }, error: null })
  } catch (error) {
    console.error("PATCH /api/notifications/[id]:", error)
    return NextResponse.json(
      { data: null, error: "Failed to update notification" },
      { status: 500 }
    )
  }
}
