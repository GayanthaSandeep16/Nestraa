"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductionOrderPanel } from "@/components/production/production-order-panel";
import { BlendOrderPanel } from "@/components/production/blend-order-panel";

type Tab = "production-orders" | "blend-orders";

const tabs: { id: Tab; label: string }[] = [
  { id: "production-orders", label: "Production Orders" },
  { id: "blend-orders", label: "Blend Orders" },
];

export function ProductionTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("production-orders");

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

      {activeTab === "production-orders" && <ProductionOrderPanel />}
      {activeTab === "blend-orders" && <BlendOrderPanel />}
    </div>
  );
}
