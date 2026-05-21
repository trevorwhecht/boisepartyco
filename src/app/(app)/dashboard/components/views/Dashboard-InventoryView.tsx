"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Download, Loader2, Upload } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import DashboardInventoryViewCategoryTab from "./inventory/Dashboard-InventoryView-CategoryTab"
import DashboardInventoryViewTentsTab from "./inventory/Dashboard-InventoryView-TentsTab"
import { parseInventoryCsv, type CsvKind } from "@/utils/csvInventory"
import type { AdminCategorySummary } from "@/models/inventory"

type Props = { role: string }

export default function DashboardInventoryView({ role }: Props) {
  const [categories, setCategories] = useState<AdminCategorySummary[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [isUploading, startUploadTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = role === "admin"

  useEffect(() => {
    fetch("/api/admin/inventory/categories")
      .then(r => r.json())
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data)
          setActiveTab(data[0].slug)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function downloadTemplate() {
    const isTents = activeTab === "tent"
    const today = new Date().toISOString().slice(0, 10)

    if (isTents) {
      const res = await fetch("/api/admin/inventory/tent-parts")
      const { data, error } = await res.json()
      if (error || !data) { toast.error("Failed to fetch tent parts"); return }
      const csv = ["id,name,part_type,qty", ...data.map((p: any) => `${p.id},${p.name},${p.partType},${p.qty ?? ""}`)].join("\n")
      triggerDownload(csv, `inventory-tent-parts-${today}.csv`)
    } else {
      const activeCat = categories.find(c => c.slug === activeTab)
      if (!activeCat) return
      const res = await fetch(`/api/admin/inventory/items?categoryId=${activeCat.id}`)
      const { data, error } = await res.json()
      if (error || !data) { toast.error("Failed to fetch items"); return }
      const csv = ["id,name,sku,qty", ...data.map((item: any) => `${item.id},${item.name},${item.sku},${item.qty ?? ""}`)].join("\n")
      triggerDownload(csv, `inventory-${activeTab}-${today}.csv`)
    }
  }

  function triggerDownload(csv: string, filename: string) {
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = "" // reset so same file can be re-selected

    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const kind: CsvKind = activeTab === "tent" ? "tent-parts" : "items"
      const parsed = parseInventoryCsv(text, kind)

      if (parsed.headerError) {
        toast.error(parsed.headerError)
        return
      }

      if (parsed.rows.length === 0) {
        const msg = parsed.errors.length > 0
          ? `Nothing to import. Errors: ${parsed.errors.slice(0, 3).join("; ")}${parsed.errors.length > 3 ? "…" : ""}`
          : `No rows to import — all qty fields are blank (${parsed.skipped} skipped)`
        toast.error(msg)
        return
      }

      startUploadTransition(async () => {
        const endpoint = kind === "tent-parts"
          ? "/api/admin/inventory/tent-parts/import"
          : "/api/admin/inventory/items/import"

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: parsed.rows }),
        })
        const json = await res.json()

        if (json.error) { toast.error(json.error); return }

        const { updated, errors: serverErrors } = json.data
        const allErrors = [...parsed.errors, ...serverErrors]
        const summary: string[] = [`${updated} updated`]
        if (parsed.skipped > 0) summary.push(`${parsed.skipped} skipped`)

        if (allErrors.length > 0) {
          const preview = allErrors.slice(0, 3).join("; ") + (allErrors.length > 3 ? "…" : "")
          toast.error(`${summary.join(", ")}. Errors: ${preview}`)
        } else {
          toast.success(summary.join(", "))
        }
      })
    }
    reader.readAsText(file)
  }

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading inventory…</div>
  if (categories.length === 0) return <div className="p-6 text-sm text-(--color-muted)">No categories found.</div>

  function renderTabContent(slug: string, id: number) {
    if (slug === "tent") return <DashboardInventoryViewTentsTab role={role} />
    return <DashboardInventoryViewCategoryTab categoryId={id} role={role} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 border-b border-(--color-border)">

        {/* Header row: title + CSV buttons */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-(--color-foreground)">Inventory</h2>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="gap-1.5 text-xs h-8"
              >
                <Download size={13} />
                Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-1.5 text-xs h-8"
              >
                {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          ) : null}
        </div>

        {/* Mobile: select dropdown */}
        <div className="block md:hidden mb-3">
          <Select value={activeTab} onValueChange={v => { if (v) setActiveTab(v) }}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent className="bg-(--color-background)">
              {categories.map(cat => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: tab strip */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b-0 p-0 h-auto gap-0 rounded-none">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat.slug}
                  value={cat.slug}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-(--color-primary) data-[state=active]:text-(--color-primary) data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-2 px-3"
                >
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab content — driven by activeTab state (shared between select + tabs) */}
      <div className="flex-1 overflow-y-auto">
        {categories.map(cat => (
          <div key={cat.slug} className={activeTab === cat.slug ? "block" : "hidden"}>
            {renderTabContent(cat.slug, cat.id)}
          </div>
        ))}
      </div>
    </div>
  )
}
