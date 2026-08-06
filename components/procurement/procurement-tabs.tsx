"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PurchaseOrderPanel } from "@/components/procurement/purchase-order-panel";
import { GrnPanel } from "@/components/procurement/grn-panel";

type Tab = "purchase-orders" | "grns";

const tabs: { id: Tab; label: string }[] = [
  { id: "purchase-orders", label: "Purchase Orders" },
  { id: "grns", label: "GRN Receiving" },
];

export function ProcurementTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("purchase-orders");

  return (
    <div className="flex flex-col gap-lg p-lg">
      <div className="flex gap-sm border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-md py-sm text-body-md font-medium",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "purchase-orders" && <PurchaseOrderPanel />}
      {activeTab === "grns" && <GrnPanel />}
    </div>
  );
}
