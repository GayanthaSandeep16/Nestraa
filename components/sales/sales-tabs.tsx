"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CustomerPanel } from "@/components/sales/customer-panel";
import { SalesOrderPanel } from "@/components/sales/sales-order-panel";

type Tab = "customers" | "orders" | "invoices" | "receipts";

const tabs: { id: Tab; label: string }[] = [
  { id: "customers", label: "Customers" },
  { id: "orders", label: "Sales Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "receipts", label: "Receipts" },
];

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-xl">
      <div className="flex flex-col items-center gap-sm text-center">
        <h2 className="text-headline-lg text-on-surface">{title}</h2>
        <p className="max-w-[28rem] text-body-md text-on-surface-variant">{description}</p>
      </div>
    </div>
  );
}

export function SalesTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("customers");

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

      {activeTab === "customers" ? (
        <CustomerPanel />
      ) : activeTab === "orders" ? (
        <SalesOrderPanel />
      ) : activeTab === "invoices" ? (
        <ComingSoonPanel
          title="Invoices"
          description="Sales Invoices are schema-ready but not built yet — coming soon."
        />
      ) : (
        <ComingSoonPanel
          title="Receipts"
          description="Payment receipts for walk-in invoices aren't built yet — see the Consignments page for retailer payments."
        />
      )}
    </div>
  );
}
