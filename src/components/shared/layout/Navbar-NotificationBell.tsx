// src/components/shared/layout/Navbar-NotificationBell.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"

type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  orderId: number | null
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NavbarNotificationBell() {
  const { data: session } = useSession()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const role = session?.user?.role
  const isStaff = role === "admin" || role === "employee"

  const fetchCount = useCallback(async () => {
    if (!isStaff) return
    try {
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data) setUnreadCount(json.data.unreadCount)
    } catch {
      // network error — ignore, keep showing stale count
    }
  }, [isStaff])

  // Poll every 30s for unread count
  useEffect(() => {
    if (!isStaff) return
    fetchCount()
    intervalRef.current = setInterval(fetchCount, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isStaff, fetchCount])

  async function handleOpen() {
    if (isOpen) { setIsOpen(false); return }
    setIsOpen(true)
    setLoading(true)
    try {
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.data) {
        setNotifications(json.data.notifications)
        setUnreadCount(json.data.unreadCount)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/notifications", { method: "PATCH" })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  if (!isStaff) return null

  const badgeCount = unreadCount > 9 ? "9+" : unreadCount

  return (
    <div style={{ position: "relative" }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        style={{
          minHeight: 44,
          minWidth: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--shop-ink)",
          touchAction: "manipulation",
          position: "relative",
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              background: "#e53e3e",
              color: "#fff",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1,
              padding: unreadCount > 9 ? "2px 4px" : "2px 5px",
              minWidth: 16,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {badgeCount}
          </span>
        ) : null}
      </button>

      {/* Backdrop */}
      {isOpen ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 35 }}
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {/* Dropdown */}
      {isOpen ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 480,
            overflowY: "auto",
            background: "var(--shop-background, #fff)",
            border: "1px solid var(--shop-line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 40,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--shop-line)",
          }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--shop-ink)" }}>Notifications</span>
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: 12,
                  color: "var(--shop-blue)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  touchAction: "manipulation",
                }}
              >
                Mark all read
              </button>
            ) : null}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--shop-ink-soft)" }}>
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 13, color: "var(--shop-ink-soft)" }}>
              No notifications yet.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--shop-line)",
                    background: n.isRead ? "var(--shop-background, #fff)" : "var(--shop-blue-soft)",
                    cursor: n.actionUrl ? "pointer" : "default",
                  }}
                  onClick={async () => {
                    if (!n.isRead) {
                      setNotifications(prev =>
                        prev.map(x => x.id === n.id ? { ...x, isRead: true } : x)
                      )
                      setUnreadCount(prev => Math.max(0, prev - 1))
                      // Await so the DB is updated before the next page mounts and re-polls
                      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" }).catch(() => null)
                    }
                    if (n.actionUrl) {
                      setIsOpen(false)
                      router.push(n.actionUrl)
                    }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--shop-ink)", lineHeight: 1.3 }}>
                      {n.title}
                    </p>
                    <span style={{ fontSize: 11, color: "var(--shop-ink-soft)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--shop-ink-soft)", lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
