// src/app/(app)/layout.tsx
import Navbar from "@/components/shared/layout/Navbar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
    </>
  )
}
