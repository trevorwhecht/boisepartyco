import type { Metadata, Viewport } from "next"
import "./globals.css"
import SessionWrapper from "@/components/shared/layout/SessionWrapper"
import { AdminQuickEditProvider } from "@/contexts/AdminQuickEditContext"
import { Toaster } from "@/components/ui/sonner"
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google"
import dynamic from "next/dynamic"

const DevLogger = process.env.NODE_ENV === "development"
  ? dynamic(() => import("@/components/DevLogger"))
  : () => null

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Boise Party Rentals",
  description: "Party and event rentals in the Treasure Valley — tents, tables, décor, and more.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh flex flex-col bg-(--color-background) text-(--color-foreground) antialiased">
        <SessionWrapper>
          <AdminQuickEditProvider>
            {children}
            <Toaster />
            <DevLogger />
          </AdminQuickEditProvider>
        </SessionWrapper>
      </body>
    </html>
  )
}
