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

type View = "current" | "low" | "expiring" | "sales" | "financials";

const views: { id: View; label: string }[] = [
  { id: "current", label: "Current Stock" },
  { id: "low", label: "Low Stock" },
  { id: "expiring", label: "Expiring Soon" },
  { id: "sales", label: "Sales Orders" },
  { id: "financials", label: "Financials" },
];

interface Financials {
  totalSales: string;
  salesThisMonth: string;
  salesInRange: string | null;
  owedToUs: string;
  weOweSuppliers: string;
  collected: string;
  collectedThisMonth: string;
}

function money(value: string | number) {
  return Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  const [financials, setFinancials] = useState<Financials | null>(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let url: string;
    if (view === "sales") url = "/api/sales-orders";
    else if (view === "financials") {
      url = "/api/reports/financials";
      if (range.from && range.to) url += `?from=${range.from}&to=${range.to}`;
    } else url = `/api/inventory/stock?view=${view}`;
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
        if (view === "financials") setFinancials(data);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view, range.from, range.to]);

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
      ) : view === "sales" ? (
        <DataTable
          columns={salesColumns}
          rows={sales}
          getRowKey={(row) => row.id}
          emptyMessage="No sales orders yet."
        />
      ) : financials ? (
        <div className="flex flex-col gap-md">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            {[
              { label: "Total sales (all-time)", value: financials.totalSales },
              { label: "Sales this month", value: financials.salesThisMonth },
              { label: "Collected this month", value: financials.collectedThisMonth },
              { label: "Owed to us (customers)", value: financials.owedToUs },
              { label: "We owe suppliers (unpaid invoices)", value: financials.weOweSuppliers },
              { label: "Collected (all-time)", value: financials.collected },
            ].map((card) => (
              <div
                key={card.label}
                className="flex flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
              >
                <dt className="text-label-sm text-on-surface-variant">{card.label}</dt>
                <dd className="text-headline-md text-on-surface">{money(card.value)}</dd>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              From
              <input
                type="date"
                value={range.from}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className="rounded-md border border-outline-variant bg-surface px-sm py-xs text-body-sm"
              />
            </label>
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              To
              <input
                type="date"
                value={range.to}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className="rounded-md border border-outline-variant bg-surface px-sm py-xs text-body-sm"
              />
            </label>
            <p className="text-body-md text-on-surface">
              Sales in range:{" "}
              <span className="font-medium">
                {range.from && range.to
                  ? financials.salesInRange != null
                    ? money(financials.salesInRange)
                    : "—"
                  : "pick both dates"}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-body-md text-on-surface-variant">No data.</p>
      )}
    </div>
  );
}
