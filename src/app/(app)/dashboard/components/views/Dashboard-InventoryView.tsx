"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DashboardInventoryViewCategoryTab from "./inventory/Dashboard-InventoryView-CategoryTab"
import DashboardInventoryViewTentsTab from "./inventory/Dashboard-InventoryView-TentsTab"
import type { AdminCategorySummary } from "@/models/inventory"

type Props = { role: string }

export default function DashboardInventoryView({ role }: Props) {
  const [categories, setCategories] = useState<AdminCategorySummary[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  const [loading, setLoading] = useState(true)

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

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading inventory…</div>
  if (categories.length === 0) return <div className="p-6 text-sm text-(--color-muted)">No categories found.</div>

  function renderTabContent(slug: string, id: number) {
    if (slug === "tent") return <DashboardInventoryViewTentsTab role={role} />
    return <DashboardInventoryViewCategoryTab categoryId={id} role={role} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 pt-4 border-b border-(--color-border)">

        {/* Header row: title */}
        <h2 className="text-lg font-semibold text-(--color-foreground) mb-3">Inventory</h2>

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
