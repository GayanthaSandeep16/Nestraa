"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, CheckCircle2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { qcResultValues } from "@/lib/validation/grns";
import {
  packagingOrderSchema,
  packagingOrderCompletionSchema,
  type PackagingOrderFormValues,
  type PackagingOrderCompletionFormValues,
} from "@/lib/validation/packaging-orders";

interface Material {
  id: string;
  sku: string;
  name: string;
  materialType: "raw" | "processed" | "finished_good";
  baseUomId: string;
}

interface PackageSize {
  id: string;
  name: string;
  netWeight: string;
  uom: { id: string; code: string };
}

interface PackagingOrder {
  id: string;
  orderNo: string;
  plannedQuantity: string;
  status: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled";
  processedMaterial: Material;
  finishedProduct: Material;
  packageSize: PackageSize;
}

interface AvailableBatch {
  id: string;
  batchNo: string;
  remainingQuantity: string;
  uom: { id: string; code: string };
}

interface Warehouse {
  id: string;
  name: string;
}

const statusTones: Record<PackagingOrder["status"], StatusTone> = {
  draft: "neutral",
  pending_approval: "info",
  approved: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const qcResultLabels: Record<(typeof qcResultValues)[number], string> = {
  pass: "Pass",
  fail: "Fail",
  conditional_pass: "Conditional Pass",
};

const emptyValues: PackagingOrderFormValues = {
  processedMaterialId: "",
  finishedProductId: "",
  packageSizeId: "",
  plannedQuantity: 0,
};

const emptyInputLine = { batchId: "", quantity: 0, uomId: "" };

function emptyCompletionValues(inputUomId: string, outputUomId: string): PackagingOrderCompletionFormValues {
  return {
    inputs: [{ ...emptyInputLine, uomId: inputUomId }],
    output: { quantity: 0, uomId: outputUomId, warehouseId: "", qcResult: "" },
    barcode: "",
  };
}

export function PackagingOrderPanel() {
  const [orders, setOrders] = useState<PackagingOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [packageSizes, setPackageSizes] = useState<PackageSize[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<PackagingOrder | null>(null);
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const createForm = useForm<PackagingOrderFormValues>({
    resolver: zodResolver(packagingOrderSchema),
    defaultValues: emptyValues,
  });

  const completionForm = useForm<PackagingOrderCompletionFormValues>({
    resolver: zodResolver(packagingOrderCompletionSchema),
  });
  const { fields, append, remove } = useFieldArray({ control: completionForm.control, name: "inputs" });

  const processedMaterials = materials.filter((material) => material.materialType === "processed");
  const finishedProducts = materials.filter((material) => material.materialType === "finished_good");

  function loadOrders() {
    return fetch(`/api/packaging-orders?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  function loadMaterials() {
    return fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  }

  function loadLookups() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => {
        setWarehouses(data.warehouses ?? []);
        setPackageSizes(data.packageSizes ?? []);
      });
  }

  useEffect(() => {
    loadMaterials();
    loadLookups();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadOrders();
  }, [page]);

  function openCreateForm() {
    setFormError(null);
    createForm.reset(emptyValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function onCreateSubmit(values: PackagingOrderFormValues) {
    setFormError(null);
    const res = await fetch("/api/packaging-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save packaging order. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadOrders();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this packaging order?")) return;
    await fetch(`/api/packaging-orders/${id}`, { method: "PATCH" });
    await loadOrders();
  }

  function openCompleteForm(order: PackagingOrder) {
    setCompletionError(null);
    const inputUomId = order.processedMaterial.baseUomId;
    const outputUomId = order.finishedProduct.baseUomId;
    completionForm.reset(emptyCompletionValues(inputUomId, outputUomId));
    setCompletingOrder(order);

    fetch(`/api/inventory/batches/available?materialId=${order.processedMaterial.id}`)
      .then((res) => res.json())
      .then(setAvailableBatches);
  }

  function closeCompleteForm() {
    setCompletingOrder(null);
    setCompletionError(null);
    setAvailableBatches([]);
  }

  async function onCompleteSubmit(values: PackagingOrderCompletionFormValues) {
    if (!completingOrder) return;
    setCompletionError(null);

    const res = await fetch(`/api/packaging-orders/${completingOrder.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setCompletionError("Could not complete the order. Check the fields and try again.");
      return;
    }

    closeCompleteForm();
    await loadOrders();
  }

  const columns: DataTableColumn<PackagingOrder>[] = [
    { key: "orderNo", header: "Order #", render: (order) => <span className="font-mono text-body-sm">{order.orderNo}</span> },
    { key: "processedMaterial", header: "Processed Material", render: (order) => order.processedMaterial.name },
    { key: "finishedProduct", header: "Finished Product", render: (order) => order.finishedProduct.name },
    { key: "packageSize", header: "Package Size", render: (order) => `${order.packageSize.name} (${order.packageSize.netWeight} ${order.packageSize.uom.code})` },
    { key: "plannedQuantity", header: "Planned Qty", render: (order) => order.plannedQuantity },
    { key: "status", header: "Status", render: (order) => <StatusBadge label={order.status.replace(/_/g, " ")} tone={statusTones[order.status]} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (order) => (
        <div className="flex justify-end gap-xs">
          {order.status === "draft" && (
            <>
              <button
                type="button"
                aria-label={`Complete ${order.orderNo}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openCompleteForm(order);
                }}
                className="rounded-md p-xs text-primary hover:bg-primary-container/30"
              >
                <CheckCircle2 size={16} />
              </button>
              <button
                type="button"
                aria-label={`Cancel ${order.orderNo}`}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelOrder(order.id);
                }}
                className="rounded-md p-xs text-error hover:bg-error-container"
              >
                <Ban size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading packaging orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={processedMaterials.length === 0 || finishedProducts.length === 0}>
          <Plus size={16} />
          New Packaging Order
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Packaging Order</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Processed Material *
              <Select {...createForm.register("processedMaterialId")} error={!!createForm.formState.errors.processedMaterialId}>
                <option value="">Select material…</option>
                {processedMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </Select>
              {createForm.formState.errors.processedMaterialId && (
                <span className="text-body-sm text-error">{createForm.formState.errors.processedMaterialId.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Finished Product *
              <Select {...createForm.register("finishedProductId")} error={!!createForm.formState.errors.finishedProductId}>
                <option value="">Select product…</option>
                {finishedProducts.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </Select>
              {createForm.formState.errors.finishedProductId && (
                <span className="text-body-sm text-error">{createForm.formState.errors.finishedProductId.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Package Size *
              <Select {...createForm.register("packageSizeId")} error={!!createForm.formState.errors.packageSizeId}>
                <option value="">Select package size…</option>
                {packageSizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name} ({size.netWeight} {size.uom.code})
                  </option>
                ))}
              </Select>
              {createForm.formState.errors.packageSizeId && (
                <span className="text-body-sm text-error">{createForm.formState.errors.packageSizeId.message}</span>
              )}
              {packageSizes.length === 0 && (
                <span className="text-body-sm text-on-surface-variant">No package sizes configured yet.</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Planned Quantity *
              <Input type="number" min={0} step="0.001" {...createForm.register("plannedQuantity")} />
            </label>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {completingOrder && (
        <form
          onSubmit={completionForm.handleSubmit(onCompleteSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">Complete {completingOrder.orderNo}</h2>
            <button type="button" onClick={closeCompleteForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">
                Input Batches — {completingOrder.processedMaterial.name}
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ ...emptyInputLine, uomId: completingOrder.processedMaterial.baseUomId })}
              >
                <Plus size={14} />
                Add Batch
              </Button>
            </div>

            {completionForm.formState.errors.inputs?.message && (
              <p className="text-body-sm text-error">{completionForm.formState.errors.inputs.message}</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-sm sm:grid-cols-[2fr_1fr_auto]">
                <input type="hidden" {...completionForm.register(`inputs.${index}.uomId` as const)} />
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Batch
                  <Select
                    {...completionForm.register(`inputs.${index}.batchId` as const)}
                    onChange={(e) => {
                      completionForm.setValue(`inputs.${index}.batchId`, e.target.value);
                      const batch = availableBatches.find((candidate) => candidate.id === e.target.value);
                      if (batch) completionForm.setValue(`inputs.${index}.uomId`, batch.uom.id);
                    }}
                  >
                    <option value="">Select batch…</option>
                    {availableBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNo} ({batch.remainingQuantity} {batch.uom.code} available)
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Quantity Consumed
                  <Input type="number" min={0} step="0.001" {...completionForm.register(`inputs.${index}.quantity` as const)} />
                </label>

                <button
                  type="button"
                  aria-label="Remove batch"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="self-end rounded-md p-xs text-error hover:bg-error-container disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-sm rounded-md border border-outline-variant p-sm">
            <h3 className="text-label-lg text-on-surface">Output — {completingOrder.finishedProduct.name}</h3>
            <input type="hidden" {...completionForm.register("output.uomId")} />
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Quantity
                <Input type="number" min={0} step="0.001" {...completionForm.register("output.quantity")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Warehouse *
                <Select {...completionForm.register("output.warehouseId")} error={!!completionForm.formState.errors.output?.warehouseId}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Unit Cost
                <Input type="number" min={0} step="0.0001" {...completionForm.register("output.unitCost")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Manufacture Date
                <Input type="date" {...completionForm.register("output.manufactureDate")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Expiry Date
                <Input type="date" {...completionForm.register("output.expiryDate")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                QC Result
                <Select {...completionForm.register("output.qcResult")}>
                  <option value="">Pending</option>
                  {qcResultValues.map((value) => (
                    <option key={value} value={value}>
                      {qcResultLabels[value]}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Barcode
                <Input {...completionForm.register("barcode")} />
              </label>
            </div>
          </div>

          {completionError && <p className="text-body-sm text-error">{completionError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeCompleteForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={completionForm.formState.isSubmitting}>
              {completionForm.formState.isSubmitting ? "Completing…" : "Complete Order"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={orders}
        getRowKey={(order) => order.id}
        emptyMessage="No packaging orders yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
