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
  productionOrderSchema,
  productionOrderCompletionSchema,
  type ProductionOrderFormValues,
  type ProductionOrderCompletionFormValues,
} from "@/lib/validation/production-orders";

interface Material {
  id: string;
  sku: string;
  name: string;
  baseUomId: string;
}

interface ProcessDefinition {
  id: string;
  name: string;
  inputMaterialId: string | null;
  outputMaterialId: string | null;
  expectedYieldPct: string | null;
  inputMaterial: Material | null;
  outputMaterial: Material | null;
}

interface ProductionOrder {
  id: string;
  orderNo: string;
  plannedQuantity: string;
  status: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled";
  plannedStartDate: string | null;
  process: ProcessDefinition | null;
  outputMaterial: Material;
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

const statusTones: Record<ProductionOrder["status"], StatusTone> = {
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

const emptyValues: ProductionOrderFormValues = {
  processId: "",
  plannedQuantity: 0,
  plannedStartDate: "",
};

const emptyInputLine = { batchId: "", quantity: 0, uomId: "" };

function emptyCompletionValues(inputUomId: string, outputUomId: string): ProductionOrderCompletionFormValues {
  return {
    inputs: [{ ...emptyInputLine, uomId: inputUomId }],
    output: { quantity: 0, uomId: outputUomId, warehouseId: "", qcResult: "" },
    waste: { quantity: 0, uomId: inputUomId, reason: "" },
  };
}

export function ProductionOrderPanel() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<ProductionOrder | null>(null);
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const createForm = useForm<ProductionOrderFormValues>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: emptyValues,
  });

  const completionForm = useForm<ProductionOrderCompletionFormValues>({
    resolver: zodResolver(productionOrderCompletionSchema),
  });
  const { fields, append, remove } = useFieldArray({ control: completionForm.control, name: "inputs" });

  const selectedProcessId = createForm.watch("processId");
  const selectedProcess = processes.find((process) => process.id === selectedProcessId);

  function loadOrders() {
    return fetch("/api/production-orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }

  function loadProcesses() {
    return fetch("/api/process-definitions")
      .then((res) => res.json())
      .then((data) => setProcesses(data));
  }

  function loadWarehouses() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses ?? []));
  }

  useEffect(() => {
    loadOrders();
    loadProcesses();
    loadWarehouses();
  }, []);

  function openCreateForm() {
    setFormError(null);
    createForm.reset(emptyValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function onCreateSubmit(values: ProductionOrderFormValues) {
    setFormError(null);
    const res = await fetch("/api/production-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save production order. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadOrders();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this production order?")) return;
    await fetch(`/api/production-orders/${id}`, { method: "PATCH" });
    await loadOrders();
  }

  function openCompleteForm(order: ProductionOrder) {
    setCompletionError(null);
    const inputUomId = order.process?.inputMaterial?.baseUomId ?? "";
    const outputUomId = order.outputMaterial.baseUomId;
    completionForm.reset(emptyCompletionValues(inputUomId, outputUomId));
    setCompletingOrder(order);

    if (order.process?.inputMaterialId) {
      fetch(`/api/inventory/batches/available?materialId=${order.process.inputMaterialId}`)
        .then((res) => res.json())
        .then(setAvailableBatches);
    } else {
      setAvailableBatches([]);
    }
  }

  function closeCompleteForm() {
    setCompletingOrder(null);
    setCompletionError(null);
    setAvailableBatches([]);
  }

  async function onCompleteSubmit(values: ProductionOrderCompletionFormValues) {
    if (!completingOrder) return;
    setCompletionError(null);

    const res = await fetch(`/api/production-orders/${completingOrder.id}/complete`, {
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

  const columns: DataTableColumn<ProductionOrder>[] = [
    { key: "orderNo", header: "Order #", render: (order) => <span className="font-mono text-body-sm">{order.orderNo}</span> },
    { key: "process", header: "Process", render: (order) => order.process?.name ?? "—" },
    { key: "output", header: "Output Material", render: (order) => order.outputMaterial.name },
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
          {loading ? "Loading production orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={processes.length === 0}>
          <Plus size={16} />
          New Production Order
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Production Order</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Process *
              <Select {...createForm.register("processId")} error={!!createForm.formState.errors.processId}>
                <option value="">Select process…</option>
                {processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </Select>
              {createForm.formState.errors.processId && (
                <span className="text-body-sm text-error">{createForm.formState.errors.processId.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Planned Quantity *
              <Input type="number" min={0} step="0.001" {...createForm.register("plannedQuantity")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Planned Start Date
              <Input type="date" {...createForm.register("plannedStartDate")} />
            </label>
          </div>

          {selectedProcess && (
            <p className="text-body-sm text-on-surface-variant">
              Input: {selectedProcess.inputMaterial?.name ?? "—"} → Output: {selectedProcess.outputMaterial?.name ?? "—"}
              {selectedProcess.expectedYieldPct ? ` · Expected yield ${selectedProcess.expectedYieldPct}%` : ""}
            </p>
          )}

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
                Input Batches — {completingOrder.process?.inputMaterial?.name ?? "material"}
              </h3>
              <Button type="button" variant="secondary" onClick={() => append({ ...emptyInputLine, uomId: completingOrder.process?.inputMaterial?.baseUomId ?? "" })}>
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
            <h3 className="text-label-lg text-on-surface">Output — {completingOrder.outputMaterial.name}</h3>
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
            </div>
          </div>

          <div className="flex flex-col gap-sm rounded-md border border-outline-variant p-sm">
            <h3 className="text-label-lg text-on-surface">Waste (optional)</h3>
            <input type="hidden" {...completionForm.register("waste.uomId")} />
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Quantity
                <Input type="number" min={0} step="0.001" {...completionForm.register("waste.quantity")} />
              </label>
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Reason
                <Input {...completionForm.register("waste.reason")} />
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

      <DataTable columns={columns} rows={orders} getRowKey={(order) => order.id} emptyMessage="No production orders yet." />
    </div>
  );
}
