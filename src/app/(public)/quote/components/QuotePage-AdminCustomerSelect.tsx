"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, Loader2 } from "lucide-react"

interface UserResult {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Props {
  onSelect: (userId: string | null) => void
}

const PAGE_SIZE = 15

async function fetchUsers(q: string, skip: number): Promise<{ data: UserResult[]; hasMore: boolean }> {
  const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&skip=${skip}&take=${PAGE_SIZE}`)
  const json = await res.json()
  return { data: json.data ?? [], hasMore: json.hasMore ?? false }
}

export default function QuotePageAdminCustomerSelect({ onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [selected, setSelected] = useState<UserResult | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [skip, setSkip] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const currentQuery = useRef(query)
  currentQuery.current = query

  // Load initial users when dropdown opens or query changes
  useEffect(() => {
    if (!open || selected) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const delay = query ? 250 : 0
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setSkip(0)
      const { data, hasMore: more } = await fetchUsers(query, 0)
      setResults(data)
      setHasMore(more)
      setLoading(false)
    }, delay)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, open, selected])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextSkip = skip + PAGE_SIZE
    const { data, hasMore: more } = await fetchUsers(currentQuery.current, nextSkip)
    setResults(prev => [...prev, ...data])
    setHasMore(more)
    setSkip(nextSkip)
    setLoadingMore(false)
  }, [loadingMore, hasMore, skip])

  // Scroll handler: load more when near bottom of list
  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMore()
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function selectUser(user: UserResult) {
    setSelected(user)
    setOpen(false)
    setQuery("")
    setResults([])
    onSelect(user.id)
  }

  function clear() {
    setSelected(null)
    onSelect(null)
  }

  if (selected) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
        style={{ border: "1px solid var(--shop-line)", background: "var(--shop-paper)" }}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: "var(--shop-ink)" }}>
            {selected.firstName} {selected.lastName}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--shop-ink-soft)" }}>
            {selected.email}
          </div>
        </div>
        <button type="button" onClick={clear}
          className="shrink-0 cursor-pointer"
          style={{ color: "var(--shop-ink-soft)" }}
          aria-label="Clear selection">
          <X size={15} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative mb-5" ref={containerRef}>
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
        style={{ border: "1px solid var(--shop-line)", background: "#fff" }}
      >
        <Search size={14} style={{ color: "var(--shop-ink-soft)", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search or select a customer"
          className="flex-1 text-sm bg-transparent focus:outline-none"
          style={{ color: "var(--shop-ink)" }}
        />
        {loading && results.length === 0 ? (
          <Loader2 size={13} className="animate-spin shrink-0" style={{ color: "var(--shop-blue)" }} />
        ) : null}
      </div>

      {open ? (
        <div
          ref={listRef}
          onScroll={handleListScroll}
          className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-md overflow-y-auto z-20"
          style={{
            background: "#fff",
            border: "1px solid var(--shop-line)",
            maxHeight: 260,
          }}
        >
          {results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--shop-ink-soft)" }}>
              {query ? "No users found" : "No users yet"}
            </div>
          ) : null}
          {results.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onClick={() => selectUser(user)}
              className="w-full text-left px-4 py-3 cursor-pointer"
              style={{
                borderBottom: idx < results.length - 1 || loadingMore ? "1px solid var(--shop-line)" : "none",
                background: "#fff",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--shop-paper)")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
            >
              <div className="text-sm font-medium" style={{ color: "var(--shop-ink)" }}>
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs" style={{ color: "var(--shop-ink-soft)" }}>{user.email}</div>
            </button>
          ))}
          {loadingMore ? (
            <div className="flex justify-center py-3">
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--shop-blue)" }} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
