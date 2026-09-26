"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StockPanel } from "@/components/inventory/stock-panel";
import { MovementsPanel } from "@/components/inventory/movements-panel";
import { BatchLineagePanel } from "@/components/inventory/batch-lineage-panel";

type Tab = "stock" | "movements" | "lineage";

const tabs: { id: Tab; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "movements", label: "Movements" },
  { id: "lineage", label: "Batch Lineage" },
];

export function InventoryTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  return (
    <div className="flex flex-col gap-lg p-md md:p-lg">
      <div className="flex gap-sm overflow-x-auto border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 whitespace-nowrap px-md py-sm text-body-md font-medium",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stock" && <StockPanel />}
      {activeTab === "movements" && <MovementsPanel />}
      {activeTab === "lineage" && <BatchLineagePanel />}
    </div>
  );
}
