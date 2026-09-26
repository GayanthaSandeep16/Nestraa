"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PurchaseOrderPanel } from "@/components/procurement/purchase-order-panel";
import { GrnPanel } from "@/components/procurement/grn-panel";
import { SupplierInvoicePanel } from "@/components/procurement/supplier-invoice-panel";
import { SupplierPaymentPanel } from "@/components/procurement/supplier-payment-panel";

type Tab = "purchase-orders" | "grns" | "supplier-invoices" | "supplier-payments";

const tabs: { id: Tab; label: string }[] = [
  { id: "purchase-orders", label: "Purchase Orders" },
  { id: "grns", label: "GRN Receiving" },
  { id: "supplier-invoices", label: "Supplier Invoices" },
  { id: "supplier-payments", label: "Supplier Payments" },
];

export function ProcurementTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("purchase-orders");

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

      {activeTab === "purchase-orders" && <PurchaseOrderPanel />}
      {activeTab === "grns" && <GrnPanel />}
      {activeTab === "supplier-invoices" && <SupplierInvoicePanel />}
      {activeTab === "supplier-payments" && <SupplierPaymentPanel />}
    </div>
  );
}
