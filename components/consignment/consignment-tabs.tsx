"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RetailerPanel } from "@/components/consignment/retailer-panel";
import { ConsignmentPanel } from "@/components/consignment/consignment-panel";
import { LedgerPanel } from "@/components/consignment/ledger-panel";
import { DashboardPanel } from "@/components/consignment/dashboard-panel";

type SubTab = "dashboard" | "retailers" | "consignments" | "ledger";

const subTabs: { id: SubTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "retailers", label: "Retailers" },
  { id: "consignments", label: "Consignments" },
  { id: "ledger", label: "Retailer Ledger" },
];

export function ConsignmentTabs() {
  const [activeTab, setActiveTab] = useState<SubTab>("dashboard");

  return (
    <div className="flex flex-col gap-md">
      <div className="flex gap-sm overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-md py-xs text-body-sm font-medium",
              activeTab === tab.id
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" ? (
        <DashboardPanel />
      ) : activeTab === "retailers" ? (
        <RetailerPanel />
      ) : activeTab === "consignments" ? (
        <ConsignmentPanel />
      ) : (
        <LedgerPanel />
      )}
    </div>
  );
}
