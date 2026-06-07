"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import DashboardInventoryViewTentPartSheet from "./Dashboard-InventoryView-TentPartSheet"
import DashboardInventoryViewTentConfigSheet from "./Dashboard-InventoryView-TentConfigSheet"
import type { AdminTentPartSummary, AdminTentConfigSummary } from "@/models/inventory"

type Tab = "parts" | "configs"

type Props = { role: string }

export default function DashboardInventoryViewTentsTab({ role }: Props) {
  const [parts, setParts] = useState<AdminTentPartSummary[]>([])
  const [configs, setConfigs] = useState<AdminTentConfigSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("parts")
  const [selectedPart, setSelectedPart] = useState<AdminTentPartSummary | null>(null)
  const [partSheetOpen, setPartSheetOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<AdminTentConfigSummary | null>(null)
  const [configSheetOpen, setConfigSheetOpen] = useState(false)
  const isAdmin = role === "admin"

  useEffect(() => {
    setLoading(true)
    const fetches = isAdmin
      ? [fetch("/api/admin/inventory/tent-parts").then(r => r.json()), fetch("/api/admin/inventory/tent-configurations").then(r => r.json())]
      : [Promise.resolve({ data: [] }), fetch("/api/admin/inventory/tent-configurations").then(r => r.json())]

    Promise.all(fetches).then(([partsJson, configsJson]) => {
      if (partsJson.data) setParts(partsJson.data)
      if (configsJson.data) setConfigs(configsJson.data)
      setLoading(false)
    })
  }, [isAdmin])

  function handlePartClick(part: AdminTentPartSummary) {
    setSelectedPart(part)
    setPartSheetOpen(true)
  }

  function handleConfigClick(config: AdminTentConfigSummary) {
    setSelectedConfig(config)
    setConfigSheetOpen(true)
  }

  async function handlePartSaved(updated: AdminTentPartSummary) {
    setParts(prev => prev.map(p => p.id === updated.id ? updated : p))
    // Re-fetch configs so canBuild / bottleneck recalculates from new qty
    const res = await fetch("/api/admin/inventory/tent-configurations")
    const { data } = await res.json()
    if (data) setConfigs(data)
  }

  function handleConfigSaved(updated: AdminTentConfigSummary) {
    setConfigs(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  if (loading) return <div className="p-6 text-sm text-(--color-muted)">Loading…</div>

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* Tab toggle — only show for admin (employees only see configs) */}
      {isAdmin ? (
        <div className="flex border border-(--color-border) rounded-lg overflow-hidden self-start w-fit">
          <button
            onClick={() => setActiveTab("parts")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "parts"
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-muted) hover:bg-(--color-surface)",
            ].join(" ")}
          >
            Tent Parts
          </button>
          <button
            onClick={() => setActiveTab("configs")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors border-l border-(--color-border)",
              activeTab === "configs"
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-muted) hover:bg-(--color-surface)",
            ].join(" ")}
          >
            Configurations
          </button>
        </div>
      ) : null}

      {/* Tent Parts — admin only, shown when parts tab is active */}
      {isAdmin && activeTab === "parts" ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-(--color-foreground)">Tent Parts</h3>
            <p className="text-xs text-(--color-muted)">Physical units you own — click a row to edit qty</p>
          </div>
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-(--color-surface) border-b border-(--color-border)">
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Part Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Type</th>
                    <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Qty Owned</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map(part => (
                    <tr
                      key={part.id}
                      className={[
                        "border-b border-(--color-border) last:border-0 cursor-pointer transition-colors hover:bg-(--color-surface)",
                        selectedPart?.id === part.id && partSheetOpen ? "bg-(--color-surface)" : "",
                      ].join(" ")}
                      onClick={() => handlePartClick(part)}
                    >
                      <td className="px-4 py-3 font-medium text-(--color-foreground)">{part.name}</td>
                      <td className="px-4 py-3 capitalize text-(--color-muted)">{part.partType}</td>
                      <td className="px-4 py-3 text-center font-semibold text-(--color-foreground)">
                        {part.qty !== null ? part.qty : <span className="text-(--color-muted)">—</span>}
                      </td>
                    </tr>
                  ))}
                  {parts.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-(--color-muted)">No tent parts found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tent Configurations — shown when configs tab is active (or always for employees) */}
      {(!isAdmin || activeTab === "configs") ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-(--color-foreground)">Tent Configurations</h3>
            <p className="text-xs text-(--color-muted)">
              {isAdmin ? "Click a row to edit price and view packing list" : "Click a row to see the packing list"}
            </p>
          </div>
          <div className="rounded-lg border border-(--color-border) overflow-hidden">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-(--color-surface) border-b border-(--color-border)">
                    <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Configuration</th>
                    <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">Can Build</th>
                    {isAdmin ? (
                      <>
                        <th className="text-right px-4 py-2.5 font-medium text-(--color-muted)">Price</th>
                        <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">Bottleneck</th>
                        <th className="text-center px-4 py-2.5 font-medium text-(--color-muted)">BOM</th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {configs.map(config => (
                    <tr
                      key={config.id}
                      className={[
                        "border-b border-(--color-border) last:border-0 cursor-pointer transition-colors hover:bg-(--color-surface)",
                        selectedConfig?.id === config.id && configSheetOpen ? "bg-(--color-surface)" : "",
                      ].join(" ")}
                      onClick={() => handleConfigClick(config)}
                    >
                      <td className="px-4 py-3 font-medium text-(--color-foreground)">{config.name}</td>
                      <td className="px-4 py-3 text-center">
                        {config.bomComplete ? (
                          <span className={[
                            "font-bold",
                            config.canBuild > 0 ? "text-green-700" : "text-(--color-danger)",
                          ].join(" ")}>
                            {config.canBuild}
                          </span>
                        ) : (
                          <span className="text-(--color-muted)">—</span>
                        )}
                      </td>
                      {isAdmin ? (
                        <>
                          <td className="px-4 py-3 text-right font-semibold text-(--color-foreground)">
                            {config.flatPrice > 0 ? `$${config.flatPrice.toFixed(2)}` : <span className="text-(--color-muted)">Call</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-amber-700">
                            {config.bottleneck
                              ? `${config.bottleneck.name} — need ${config.bottleneck.qtyRequired}, have ${config.bottleneck.stock} → ${config.bottleneck.maxFromThisPart} max`
                              : <span className="text-(--color-muted)">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {config.bomComplete ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">✓ Complete</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">⚠ Incomplete</Badge>
                            )}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                  {configs.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 5 : 2} className="px-4 py-4 text-center text-(--color-muted)">No configurations found.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <DashboardInventoryViewTentPartSheet
          part={selectedPart}
          open={partSheetOpen}
          onOpenChange={setPartSheetOpen}
          onSaved={handlePartSaved}
        />
      ) : null}

      <DashboardInventoryViewTentConfigSheet
        config={selectedConfig}
        open={configSheetOpen}
        onOpenChange={setConfigSheetOpen}
        onSaved={handleConfigSaved}
        role={role}
      />
    </div>
  )
}
