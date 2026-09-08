"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CustomerPanel } from "@/components/sales/customer-panel";
import { SalesOrderPanel } from "@/components/sales/sales-order-panel";
import { InvoicePanel } from "@/components/sales/invoice-panel";
import { ReceiptsPanel } from "@/components/sales/receipts-panel";
import { PricingPanel } from "@/components/sales/pricing-panel";
import { DeliveriesPanel } from "@/components/sales/deliveries-panel";
import { ReturnsPanel } from "@/components/sales/returns-panel";

type Tab = "customers" | "orders" | "invoices" | "receipts" | "pricing" | "deliveries" | "returns";

const tabs: { id: Tab; label: string }[] = [
  { id: "customers", label: "Customers" },
  { id: "orders", label: "Sales Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "receipts", label: "Receipts" },
  { id: "pricing", label: "Pricing" },
  { id: "deliveries", label: "Deliveries" },
  { id: "returns", label: "Returns" },
];

const panels: Record<Tab, ReactNode> = {
  customers: <CustomerPanel />,
  orders: <SalesOrderPanel />,
  invoices: <InvoicePanel />,
  receipts: <ReceiptsPanel />,
  pricing: <PricingPanel />,
  deliveries: <DeliveriesPanel />,
  returns: <ReturnsPanel />,
};

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

      {panels[activeTab]}
    </div>
  );
}
