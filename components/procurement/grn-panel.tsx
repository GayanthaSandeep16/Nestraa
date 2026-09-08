"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { grnSchema, processingPathValues, qcResultValues, type GrnFormValues } from "@/lib/validation/grns";

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
  qtyReceived: string;
  material: Material;
  uom: { id: string; code: string };
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  status: string;
  supplierId: string;
  supplier: Supplier;
  items: PurchaseOrderItem[];
}

interface Grn {
  id: string;
  grnNo: string;
  receivedAt: string;
  supplier: Supplier;
  warehouse: { id: string; name: string };
  po: { id: string; poNo: string } | null;
  items: { id: string; quantity: string; qcResult: string | null; material: Material }[];
}

interface Lookups {
  unitsOfMeasure: { id: string; code: string; name: string }[];
  warehouses: { id: string; name: string }[];
}

const qcResultLabels: Record<(typeof qcResultValues)[number], string> = {
  pass: "Pass",
  fail: "Fail",
  conditional_pass: "Conditional Pass",
};

const processingPathLabels: Record<(typeof processingPathValues)[number], string> = {
  ready_for_packaging: "Ready for Packaging",
  requires_processing: "Needs Simple Processing",
  requires_blending: "Needs Blending",
};

const emptyLine = {
  poItemId: "",
  materialId: "",
  quantity: 0,
  unitCost: 0,
  uomId: "",
  qcResult: "" as (typeof qcResultValues)[number] | "",
  qcNotes: "",
  processingPath: "" as (typeof processingPathValues)[number] | "",
  manufactureDate: "",
  expiryDate: "",
};

const emptyValues: GrnFormValues = {
  poId: "",
  supplierId: "",
  warehouseId: "",
  notes: "",
  items: [emptyLine],
};

export function GrnPanel() {
  const [grns, setGrns] = useState<Grn[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ unitsOfMeasure: [], warehouses: [] });
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GrnFormValues>({
    resolver: zodResolver(grnSchema),
    defaultValues: emptyValues,
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });
  const selectedPoId = watch("poId");

  const outstandingPos = purchaseOrders.filter((po) => po.status === "sent" || po.status === "partially_received");

  function loadGrns() {
    return fetch(`/api/grns?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setGrns(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  function loadPurchaseOrders() {
    return fetch("/api/purchase-orders")
      .then((res) => res.json())
      .then((data) => setPurchaseOrders(data));
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadGrns();
  }, [page]);

  function openCreateForm() {
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  function handlePoSelect(poId: string) {
    setValue("poId", poId);
    const po = purchaseOrders.find((candidate) => candidate.id === poId);
    if (!po) return;

    setValue("supplierId", po.supplierId);
    const outstandingItems = po.items
      .filter((item) => Number(item.qtyReceived) < Number(item.quantity))
      .map((item) => ({
        ...emptyLine,
        poItemId: item.id,
        materialId: item.materialId,
        quantity: Number(item.quantity) - Number(item.qtyReceived),
        uomId: item.uom.id,
      }));
    replace(outstandingItems.length > 0 ? outstandingItems : [emptyLine]);
  }

  async function onSubmit(values: GrnFormValues) {
    setFormError(null);
    const res = await fetch("/api/grns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save GRN. Check the fields and try again.");
      return;
    }

    closeForm();
    await Promise.all([loadGrns(), loadPurchaseOrders()]);
  }

  const columns: DataTableColumn<Grn>[] = [
    { key: "grnNo", header: "GRN #", render: (grn) => <span className="font-mono text-body-sm">{grn.grnNo}</span> },
    { key: "po", header: "PO #", render: (grn) => grn.po?.poNo ?? "—" },
    { key: "supplier", header: "Supplier", render: (grn) => grn.supplier.name },
    { key: "warehouse", header: "Warehouse", render: (grn) => grn.warehouse.name },
    { key: "receivedAt", header: "Received", render: (grn) => new Date(grn.receivedAt).toLocaleDateString() },
    { key: "items", header: "Lines", render: (grn) => grn.items.length },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading GRNs…" : `${grns.length} GRN${grns.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={suppliers.length === 0 || lookups.warehouses.length === 0}>
          <Plus size={16} />
          Log GRN
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">Log GRN</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Purchase Order
              <Select value={selectedPoId} onChange={(e) => handlePoSelect(e.target.value)}>
                <option value="">No PO (freeform)</option>
                {outstandingPos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNo} — {po.supplier.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Supplier *
              <Select {...register("supplierId")} error={!!errors.supplierId} disabled={!!selectedPoId}>
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
              Warehouse *
              <Select {...register("warehouseId")} error={!!errors.warehouseId}>
                <option value="">Select warehouse…</option>
                {lookups.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
              {errors.warehouseId && <span className="text-body-sm text-error">{errors.warehouseId.message}</span>}
            </label>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">Received Lines</h3>
              <Button type="button" variant="secondary" onClick={() => append(emptyLine)}>
                <Plus size={14} />
                Add Line
              </Button>
            </div>

            {errors.items?.message && <p className="text-body-sm text-error">{errors.items.message}</p>}

            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-sm rounded-md border border-outline-variant p-sm">
                <input type="hidden" {...register(`items.${index}.poItemId` as const)} />
                <div className="grid grid-cols-1 gap-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Material
                    <Select
                      {...register(`items.${index}.materialId` as const)}
                      error={!!errors.items?.[index]?.materialId}
                      disabled={!!watch(`items.${index}.poItemId`)}
                    >
                      <option value="">Select material…</option>
                      {materials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} ({material.sku})
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Qty Received
                    <Input type="number" min={0} step="0.001" {...register(`items.${index}.quantity` as const)} />
                  </label>

                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Unit Cost
                    <Input type="number" min={0} step="0.0001" {...register(`items.${index}.unitCost` as const)} />
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

                <div className="grid grid-cols-1 gap-sm sm:grid-cols-4">
                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    QC Result
                    <Select {...register(`items.${index}.qcResult` as const)}>
                      <option value="">Pending</option>
                      {qcResultValues.map((value) => (
                        <option key={value} value={value}>
                          {qcResultLabels[value]}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Processing Path
                    <Select {...register(`items.${index}.processingPath` as const)}>
                      <option value="">Unspecified</option>
                      {processingPathValues.map((value) => (
                        <option key={value} value={value}>
                          {processingPathLabels[value]}
                        </option>
                      ))}
                    </Select>
                  </label>

                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Manufacture Date
                    <Input type="date" {...register(`items.${index}.manufactureDate` as const)} />
                  </label>

                  <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                    Expiry Date
                    <Input type="date" {...register(`items.${index}.expiryDate` as const)} />
                  </label>
                </div>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  QC Notes
                  <Input {...register(`items.${index}.qcNotes` as const)} />
                </label>
              </div>
            ))}
          </div>

          <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
            Notes
            <Input {...register("notes")} />
          </label>

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
        rows={grns}
        getRowKey={(grn) => grn.id}
        emptyMessage="No GRNs logged yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
