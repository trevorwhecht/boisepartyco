function parseBase64DataUrl(dataUrl: string): { mimeType: string; base64Data: string } {
  const marker = ";base64,"
  const markerIdx = dataUrl.indexOf(marker)
  if (markerIdx === -1 || !dataUrl.toLowerCase().startsWith("data:")) throw new Error("Invalid data URL format")
  const mimeType = dataUrl.slice("data:".length, markerIdx).trim()
  const base64Data = dataUrl.slice(markerIdx + marker.length)
  if (!mimeType.length || !base64Data.length) throw new Error("Invalid data URL format")
  const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]
  if (!ALLOWED_MIME.includes(mimeType)) throw new Error(`Unsupported image type: ${mimeType}`)
  return { mimeType, base64Data }
}

let cloudinaryV2: typeof import("cloudinary").v2 | null = null

async function getCloudinaryV2() {
  if (!cloudinaryV2) cloudinaryV2 = (await import("cloudinary")).v2
  return cloudinaryV2
}

export async function uploadBase64ToCloudinary(
  dataUrl: string,
  folder = "inventory-items",
  publicId?: string,
): Promise<string> {
  if (!process.env.CLOUDINARY_URL) throw new Error("CLOUDINARY_URL not configured")
  if (!dataUrl.startsWith("data:")) return dataUrl

  const { mimeType, base64Data } = parseBase64DataUrl(dataUrl)
  const buffer = Buffer.from(base64Data, "base64")
  const cloudinary = await getCloudinaryV2()

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        format: mimeType === "image/png" ? "png" : undefined,
        transformation: [{ quality: "auto:best" }],
      },
      (error, result) => {
        if (error) reject(error)
        else if (result?.secure_url) resolve(result.secure_url)
        else reject(new Error("Cloudinary returned no secure_url"))
      },
    )
    stream.end(buffer)
  })
}
