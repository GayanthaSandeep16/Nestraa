"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { purchaseOrderSchema, type PurchaseOrderFormValues } from "@/lib/validation/purchase-orders";

interface Material {
  id: string;
  sku: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseOrderItem {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  qtyReceived: string;
  material: Material;
  uom: { id: string; code: string };
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  status: "draft" | "sent" | "partially_received" | "received" | "closed" | "cancelled";
  orderDate: string;
  expectedDate: string | null;
  supplier: Supplier;
  items: PurchaseOrderItem[];
}

interface Lookups {
  unitsOfMeasure: { id: string; code: string; name: string }[];
}

const statusTones: Record<PurchaseOrder["status"], StatusTone> = {
  draft: "neutral",
  sent: "info",
  partially_received: "warning",
  received: "success",
  closed: "neutral",
  cancelled: "error",
};

const emptyLine = { materialId: "", quantity: 0, unitPrice: 0, uomId: "" };

const emptyValues: PurchaseOrderFormValues = {
  supplierId: "",
  expectedDate: "",
  items: [emptyLine],
};

export function PurchaseOrderPanel() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ unitsOfMeasure: [] });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: emptyValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  function loadPurchaseOrders() {
    return fetch("/api/purchase-orders")
      .then((res) => res.json())
      .then((data) => {
        setPurchaseOrders(data);
        setLoading(false);
      });
  }

  function loadSuppliers() {
    return fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data));
  }

  function loadMaterials() {
    return fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  }

  function loadLookups() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setLookups(data));
  }

  useEffect(() => {
    loadPurchaseOrders();
    loadSuppliers();
    loadMaterials();
    loadLookups();
  }, []);

  function openCreateForm() {
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function onSubmit(values: PurchaseOrderFormValues) {
    setFormError(null);
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save purchase order. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadPurchaseOrders();
  }

  async function updateStatus(id: string, status: "sent" | "cancelled") {
    await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadPurchaseOrders();
  }

  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: "poNo", header: "PO #", render: (po) => <span className="font-mono text-body-sm">{po.poNo}</span> },
    { key: "supplier", header: "Supplier", render: (po) => po.supplier.name },
    { key: "orderDate", header: "Order Date", render: (po) => new Date(po.orderDate).toLocaleDateString() },
    {
      key: "expectedDate",
      header: "Expected",
      render: (po) => (po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : "—"),
    },
    { key: "items", header: "Lines", render: (po) => po.items.length },
    {
      key: "status",
      header: "Status",
      render: (po) => <StatusBadge label={po.status.replace(/_/g, " ")} tone={statusTones[po.status]} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (po) => (
        <div className="flex justify-end gap-xs">
          {po.status === "draft" && (
            <button
              type="button"
              aria-label={`Send ${po.poNo}`}
              onClick={(e) => {
                e.stopPropagation();
                updateStatus(po.id, "sent");
              }}
              className="rounded-md p-xs text-primary hover:bg-primary-container/30"
            >
              <Send size={16} />
            </button>
          )}
          {(po.status === "draft" || po.status === "sent") && (
            <button
              type="button"
              aria-label={`Cancel ${po.poNo}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm(`Cancel ${po.poNo}?`)) return;
                updateStatus(po.id, "cancelled");
              }}
              className="rounded-md p-xs text-error hover:bg-error-container"
            >
              <Ban size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading purchase orders…" : `${purchaseOrders.length} purchase order${purchaseOrders.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={suppliers.length === 0 || materials.length === 0}>
          <Plus size={16} />
          New Purchase Order
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Purchase Order</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Supplier *
              <Select {...register("supplierId")} error={!!errors.supplierId}>
                <option value="">Select supplier…</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
              {errors.supplierId && <span className="text-body-sm text-error">{errors.supplierId.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Expected Date
              <Input type="date" {...register("expectedDate")} />
            </label>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">Line Items</h3>
              <Button type="button" variant="secondary" onClick={() => append(emptyLine)}>
                <Plus size={14} />
                Add Line
              </Button>
            </div>

            {errors.items?.message && <p className="text-body-sm text-error">{errors.items.message}</p>}

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]"
              >
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Material
                  <Select {...register(`items.${index}.materialId` as const)} error={!!errors.items?.[index]?.materialId}>
                    <option value="">Select material…</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.sku})
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Quantity
                  <Input type="number" min={0} step="0.001" {...register(`items.${index}.quantity` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Unit Price
                  <Input type="number" min={0} step="0.0001" {...register(`items.${index}.unitPrice` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  UoM
                  <Select {...register(`items.${index}.uomId` as const)} error={!!errors.items?.[index]?.uomId}>
                    <option value="">Unit…</option>
                    {lookups.unitsOfMeasure.map((uom) => (
                      <option key={uom.id} value={uom.id}>
                        {uom.code}
                      </option>
                    ))}
                  </Select>
                </label>

                <button
                  type="button"
                  aria-label="Remove line"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="self-end rounded-md p-xs text-error hover:bg-error-container disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={purchaseOrders}
        getRowKey={(po) => po.id}
        emptyMessage="No purchase orders yet. Create one to get started."
      />
    </div>
  );
}
