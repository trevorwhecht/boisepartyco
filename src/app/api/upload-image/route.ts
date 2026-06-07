import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadBase64ToCloudinary } from "@/utils/cloudinaryUpload"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "admin" && session.user.role !== "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { dataUrl, folder, publicId } = body

  if (!dataUrl || typeof dataUrl !== "string") {
    return NextResponse.json({ error: "dataUrl is required" }, { status: 400 })
  }

  if (!dataUrl.startsWith("data:")) {
    // passthrough: already an uploaded URL (e.g., existing item image), nothing to upload
    return NextResponse.json({ url: dataUrl })
  }

  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 })
  }

  try {
    const url = await uploadBase64ToCloudinary(dataUrl, folder, publicId)
    // intentional: spec requires { url } shape for this upload-specific endpoint
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error("[upload-image]", err)
    const details = err?.message ?? "Upload failed"
    return NextResponse.json({ error: "Upload failed", details }, { status: 500 })
  }
}
