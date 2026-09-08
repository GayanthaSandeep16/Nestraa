"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

interface Movement {
  id: string;
  direction: "in" | "out" | "adjustment";
  quantity: string;
  source: string;
  createdAt: string;
  unitCost: string | null;
  material: { id: string; sku: string; name: string };
  warehouse: { id: string; name: string };
  uom: { code: string };
  batch: { batchNo: string; qcResult: "pass" | "fail" | "conditional_pass" | null } | null;
}

interface Material {
  id: string;
  sku: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

const directionTones: Record<Movement["direction"], StatusTone> = {
  in: "success",
  out: "error",
  adjustment: "warning",
};

const qcTones: Record<string, StatusTone> = {
  pass: "success",
  fail: "error",
  conditional_pass: "warning",
};

export function MovementsPanel() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [direction, setDirection] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  // Any filter change resets to page 1.
  useEffect(() => setPage(1), [materialId, warehouseId, direction]);

  useEffect(() => {
    fetch("/api/materials")
      .then((res) => res.json())
      .then(setMaterials);
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (materialId) params.set("materialId", materialId);
    if (warehouseId) params.set("warehouseId", warehouseId);
    if (direction) params.set("direction", direction);

    fetch(`/api/inventory/movements?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setMovements(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }, [materialId, warehouseId, direction, page]);

  const columns: DataTableColumn<Movement>[] = [
    { key: "date", header: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
    { key: "material", header: "Material", render: (row) => `${row.material.name} (${row.material.sku})` },
    { key: "direction", header: "Direction", render: (row) => <StatusBadge label={row.direction} tone={directionTones[row.direction]} /> },
    { key: "quantity", header: "Quantity", render: (row) => `${row.quantity} ${row.uom.code}` },
    { key: "source", header: "Source", render: (row) => row.source.replace(/_/g, " ") },
    { key: "warehouse", header: "Warehouse", render: (row) => row.warehouse?.name ?? "—" },
    { key: "batch", header: "Batch #", render: (row) => row.batch?.batchNo ?? "—" },
    {
      key: "qc",
      header: "QC",
      render: (row) =>
        row.batch?.qcResult ? (
          <StatusBadge label={row.batch.qcResult.replace(/_/g, " ")} tone={qcTones[row.batch.qcResult]} />
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
        <Select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          <option value="">All materials</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name} ({material.sku})
            </option>
          ))}
        </Select>

        <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </Select>

        <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="">All directions</option>
          <option value="in">In</option>
          <option value="out">Out</option>
          <option value="adjustment">Adjustment</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          rows={movements}
          getRowKey={(row) => row.id}
          emptyMessage="No movements recorded yet."
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
