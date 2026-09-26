"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductPanel } from "@/components/product-catalog/product-panel";
import { RecipePanel } from "@/components/product-catalog/recipe-panel";
import { ProcessPanel } from "@/components/product-catalog/process-panel";

type Tab = "products" | "recipes" | "processes";

const tabs: { id: Tab; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "recipes", label: "Recipes (BOM)" },
  { id: "processes", label: "Process Routing" },
];

export function ProductCatalogTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("products");

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

      {activeTab === "products" && <ProductPanel />}
      {activeTab === "recipes" && <RecipePanel />}
      {activeTab === "processes" && <ProcessPanel />}
    </div>
  );
}
