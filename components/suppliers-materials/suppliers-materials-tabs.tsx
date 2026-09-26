"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SupplierPanel } from "@/components/suppliers-materials/supplier-panel";
import { MaterialPanel } from "@/components/suppliers-materials/material-panel";

type Tab = "suppliers" | "materials";

const tabs: { id: Tab; label: string }[] = [
  { id: "suppliers", label: "Suppliers" },
  { id: "materials", label: "Materials" },
];

export function SuppliersMaterialsTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("suppliers");

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

      {activeTab === "suppliers" ? <SupplierPanel /> : <MaterialPanel />}
    </div>
  );
}
