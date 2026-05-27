"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { useOrderStates } from "@/hooks/useOrderStates"

export default function DashboardSettingsViewOrderStates() {
  const { orderStates, updateState } = useOrderStates()
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: number, current: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/order-states/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consumesInventory: !current }),
      })
      const json = await res.json()
      if (json.error) { toast.error(json.error); return }
      updateState(json.data)
    })
  }

  const visible = orderStates.filter((s) => s.id !== 0) // hide Archived — it should never consume

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-(--color-foreground)">Order States — Inventory</h3>
        <p className="text-sm text-(--color-muted) mt-0.5">
          When "Reserves Inventory" is on, orders in that state count against available stock. Turn it on once the customer has committed (deposit received, work started, etc.).
        </p>
      </div>
      <div className="rounded-lg border border-(--color-border) overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--color-border) bg-(--color-surface)">
              <th className="text-left px-4 py-2.5 font-medium text-(--color-muted)">State</th>
              <th className="text-left px-4 py-2.5 font-medium text-(--color-muted) hidden sm:table-cell">Description</th>
              <th className="text-left px-4 py-2.5 font-medium text-(--color-muted) w-40">Reserves Inventory</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((state) => (
              <tr key={state.id} className="border-b border-(--color-border) last:border-0">
                <td className="px-4 py-3 font-medium text-(--color-foreground) whitespace-nowrap">
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ background: state.color ?? "var(--color-muted)" }}
                  />
                  {state.name}
                </td>
                <td className="px-4 py-3 text-(--color-muted) text-xs hidden sm:table-cell">{state.description}</td>
                <td className="px-4 py-3">
                  <Switch
                    checked={state.consumesInventory}
                    onCheckedChange={() => handleToggle(state.id, state.consumesInventory)}
                    disabled={isPending}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
