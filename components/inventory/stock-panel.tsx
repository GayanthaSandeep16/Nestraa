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

type View = "current" | "low" | "expiring";

const views: { id: View; label: string }[] = [
  { id: "current", label: "Current Stock" },
  { id: "low", label: "Low Stock" },
  { id: "expiring", label: "Expiring Soon" },
];

export function StockPanel() {
  const [view, setView] = useState<View>("current");
  const [current, setCurrent] = useState<CurrentStockRow[]>([]);
  const [low, setLow] = useState<LowStockRow[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventory/stock?view=${view}`)
      .then((res) => res.json())
      .then((data) => {
        if (view === "current") setCurrent(data);
        if (view === "low") setLow(data);
        if (view === "expiring") setExpiring(data);
        setLoading(false);
      });
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
      ) : (
        <DataTable
          columns={expiringColumns}
          rows={expiring}
          getRowKey={(row) => row.batchNo}
          emptyMessage="No batches expiring within 30 days."
        />
      )}
    </div>
  );
}
