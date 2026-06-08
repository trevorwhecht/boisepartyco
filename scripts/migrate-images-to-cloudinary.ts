// scripts/migrate-images-to-cloudinary.ts
// One-time migration: reads local /public/images/** files, uploads to Cloudinary,
// then updates Item and TentConfiguration rows with the resulting URLs.
//
// Run via: npm run migrate-images
// (loads .env.local automatically through the npm script)

import * as path from "node:path"
import * as fs from "node:fs"
import { ITEM_IMAGES } from "../src/lib/item-images"
import { TENT_IMAGES } from "../src/lib/tent-images"
import { uploadBase64ToCloudinary } from "../src/utils/cloudinaryUpload"
import { prisma } from "../src/lib/prisma"

const PUBLIC_DIR = path.resolve(__dirname, "../public")

function mimeTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".webp") return "image/webp"
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg"
  if (ext === ".png") return "image/png"
  throw new Error(`Unsupported file extension: ${ext}`)
}

function folderFromPath(imagePath: string): string {
  // imagePath is like /images/tables/... or /images/tents/...
  if (imagePath.startsWith("/images/tents/")) return "inventory-tents"
  return "inventory-items"
}

function publicIdFromPath(imagePath: string): string {
  return path.basename(imagePath, path.extname(imagePath))
}

async function uploadLocalImage(imagePath: string): Promise<string> {
  const absolutePath = path.join(PUBLIC_DIR, imagePath)
  const buffer = fs.readFileSync(absolutePath)
  const mimeType = mimeTypeFromPath(imagePath)
  const base64 = buffer.toString("base64")
  const dataUrl = `data:${mimeType};base64,${base64}`
  const folder = folderFromPath(imagePath)
  const publicId = publicIdFromPath(imagePath)
  const url = await uploadBase64ToCloudinary(dataUrl, folder, publicId)
  console.log(`  Uploaded ${imagePath} → ${url}`)
  return url
}

async function main() {
  console.log("=== Cloudinary image migration ===\n")

  // Collect all unique local paths across both maps
  const allPaths = new Set<string>([
    ...Object.values(ITEM_IMAGES),
    ...Object.values(TENT_IMAGES),
  ])

  // Upload each unique file once, cache path → Cloudinary URL
  console.log(`Uploading ${allPaths.size} unique image(s) to Cloudinary...`)
  const urlCache = new Map<string, string>()

  for (const imagePath of allPaths) {
    try {
      const url = await uploadLocalImage(imagePath)
      urlCache.set(imagePath, url)
    } catch (err: any) {
      console.error(`  ERROR uploading ${imagePath}: ${err.message}`)
    }
  }

  console.log(`\nUploads complete. Updating database...\n`)

  // ── Items ─────────────────────────────────────────────────────────────────
  let itemsUpdated = 0
  let itemsSkipped = 0

  for (const [slug, imagePath] of Object.entries(ITEM_IMAGES)) {
    const item = await prisma.item.findUnique({
      where: { slug },
      select: { id: true, slug: true, primaryImageUrl: true },
    })

    if (!item) {
      console.log(`  [items] SKIP slug="${slug}" — not found in DB`)
      itemsSkipped++
      continue
    }

    if (item.primaryImageUrl?.startsWith("https://res.cloudinary.com")) {
      console.log(`  [items] SKIP slug="${slug}" — already on Cloudinary`)
      itemsSkipped++
      continue
    }

    const cloudinaryUrl = urlCache.get(imagePath)
    if (!cloudinaryUrl) {
      console.log(`  [items] SKIP slug="${slug}" — upload failed for ${imagePath}`)
      itemsSkipped++
      continue
    }

    await prisma.item.update({
      where: { slug },
      data: { primaryImageUrl: cloudinaryUrl },
    })
    console.log(`  [items] UPDATED slug="${slug}" → ${cloudinaryUrl}`)
    itemsUpdated++
  }

  // ── Tent configurations ───────────────────────────────────────────────────
  let tentsUpdated = 0
  let tentsSkipped = 0

  for (const [slug, imagePath] of Object.entries(TENT_IMAGES)) {
    const tent = await prisma.tentConfiguration.findUnique({
      where: { slug },
      select: { id: true, slug: true, primaryImageUrl: true },
    })

    if (!tent) {
      console.log(`  [tents] SKIP slug="${slug}" — not found in DB`)
      tentsSkipped++
      continue
    }

    if (tent.primaryImageUrl?.startsWith("https://res.cloudinary.com")) {
      console.log(`  [tents] SKIP slug="${slug}" — already on Cloudinary`)
      tentsSkipped++
      continue
    }

    const cloudinaryUrl = urlCache.get(imagePath)
    if (!cloudinaryUrl) {
      console.log(`  [tents] SKIP slug="${slug}" — upload failed for ${imagePath}`)
      tentsSkipped++
      continue
    }

    await prisma.tentConfiguration.update({
      where: { slug },
      data: { primaryImageUrl: cloudinaryUrl },
    })
    console.log(`  [tents] UPDATED slug="${slug}" → ${cloudinaryUrl}`)
    tentsUpdated++
  }

  console.log(`
=== Migration summary ===
Items:  ${itemsUpdated} updated, ${itemsSkipped} skipped
Tents:  ${tentsUpdated} updated, ${tentsSkipped} skipped
`)
}

main()
  .catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
