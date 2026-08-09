"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

interface CurrentStockRow {
  material: { id: string; sku: string; name: string; baseUom: { code: string } } | null;
  warehouse: { id: string; name: string } | null;
  quantityOnHand: string;
}

interface LowStockRow {
  materialId: string;
  name: string;
  reorderLevel: string;
  onHand: string;
}

interface ExpiringBatchRow {
  batchNo: string;
  material: { id: string; sku: string; name: string; baseUom: { code: string } } | null;
  quantity: string;
  expiryDate: string;
}

interface SalesOrderRow {
  id: string;
  orderNo: string;
  status: string;
  orderDate: string;
  customer: { id: string; name: string };
  items: { quantity: string; unitPrice: string; discountPct: string }[];
}

type View = "current" | "low" | "expiring" | "sales";

const views: { id: View; label: string }[] = [
  { id: "current", label: "Current Stock" },
  { id: "low", label: "Low Stock" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "sales", label: "Sales Orders" },
];

function salesOrderTotal(order: SalesOrderRow) {
  return order.items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const discount = Number(item.discountPct) || 0;
    return sum + qty * price * (1 - discount / 100);
  }, 0);
}

export function ReportsPanel() {
  const [view, setView] = useState<View>("current");
  const [current, setCurrent] = useState<CurrentStockRow[]>([]);
  const [low, setLow] = useState<LowStockRow[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatchRow[]>([]);
  const [sales, setSales] = useState<SalesOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = view === "sales" ? "/api/sales-orders" : `/api/inventory/stock?view=${view}`;
    fetch(url)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(typeof data?.error === "string" ? data.error : "Failed to load report");
        }
        if (view === "current") setCurrent(data);
        if (view === "low") setLow(data);
        if (view === "expiring") setExpiring(data);
        if (view === "sales") setSales(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view]);

  const currentColumns: DataTableColumn<CurrentStockRow>[] = [
    { key: "sku", header: "SKU", render: (row) => row.material?.sku ?? "—" },
    { key: "material", header: "Material", render: (row) => row.material?.name ?? "—" },
    { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse?.name ?? "—" },
    {
      key: "quantity",
      header: "On Hand",
      render: (row) => `${row.quantityOnHand} ${row.material?.baseUom.code ?? ""}`,
    },
  ];

  const lowColumns: DataTableColumn<LowStockRow>[] = [
    { key: "material", header: "Material", render: (row) => row.name },
    { key: "onHand", header: "On Hand", render: (row) => row.onHand },
    { key: "reorderLevel", header: "Reorder Level", render: (row) => row.reorderLevel },
  ];

  const expiringColumns: DataTableColumn<ExpiringBatchRow>[] = [
    { key: "batchNo", header: "Batch #", render: (row) => <span className="font-mono text-body-sm">{row.batchNo}</span> },
    { key: "material", header: "Material", render: (row) => row.material?.name ?? "—" },
    { key: "quantity", header: "Quantity", render: (row) => `${row.quantity} ${row.material?.baseUom.code ?? ""}` },
    { key: "expiryDate", header: "Expires", render: (row) => new Date(row.expiryDate).toLocaleDateString() },
  ];

  const salesColumns: DataTableColumn<SalesOrderRow>[] = [
    { key: "orderNo", header: "Order #", render: (row) => <span className="font-mono text-body-sm">{row.orderNo}</span> },
    { key: "customer", header: "Customer", render: (row) => row.customer.name },
    { key: "orderDate", header: "Order Date", render: (row) => new Date(row.orderDate).toLocaleDateString() },
    { key: "items", header: "Line Items", render: (row) => row.items.length },
    { key: "status", header: "Status", render: (row) => row.status.replace(/_/g, " ") },
    { key: "total", header: "Total", render: (row) => salesOrderTotal(row).toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex gap-xs">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={cn(
              "rounded-md px-md py-xs text-body-sm font-medium",
              view === v.id
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Loading…</p>
      ) : error ? (
        <p className="text-body-md text-error">{error}</p>
      ) : view === "current" ? (
        <DataTable
          columns={currentColumns}
          rows={current}
          getRowKey={(row) => `${row.material?.id}-${row.warehouse?.id}`}
          emptyMessage="No stock recorded yet."
        />
      ) : view === "low" ? (
        <DataTable
          columns={lowColumns}
          rows={low}
          getRowKey={(row) => row.materialId}
          emptyMessage="No materials at or below reorder level."
        />
      ) : view === "expiring" ? (
        <DataTable
          columns={expiringColumns}
          rows={expiring}
          getRowKey={(row) => row.batchNo}
          emptyMessage="No batches expiring within 30 days."
        />
      ) : (
        <DataTable
          columns={salesColumns}
          rows={sales}
          getRowKey={(row) => row.id}
          emptyMessage="No sales orders yet."
        />
      )}
    </div>
  );
}
