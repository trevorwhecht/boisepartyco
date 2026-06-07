import { appendFileSync, mkdirSync } from "fs"
import { join } from "path"
import { NextResponse } from "next/server"

// Only active in development — guard at the top
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const body = await req.json()
  const { level, args, timestamp } = body as {
    level: string
    args: unknown[]
    timestamp: string
  }

  const logDir = join(process.cwd(), ".logs")
  mkdirSync(logDir, { recursive: true })

  const line = `[${timestamp}] [${level.toUpperCase()}] ${args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ")}\n`
  appendFileSync(join(logDir, "browser.log"), line, "utf8")

  return NextResponse.json({ ok: true })
}
