"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, Truck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { consignmentSchema, type ConsignmentFormValues } from "@/lib/validation/consignments";
import { paymentMethodValues, type PaymentFormValues } from "@/lib/validation/payments";
import { returnQualityStatusValues } from "@/lib/validation/consignment-returns";
import { fetchJson } from "@/lib/http";

const SYSTEM_WAREHOUSE_NAMES = new Set(["Damaged Stock", "Waste Stock"]);

interface Retailer {
  id: string;
  retailerCode: string;
  customerId: string;
  customer: { name: string };
}

interface Warehouse {
  id: string;
  name: string;
}

interface FinishedGood {
  id: string;
  sku: string;
  name: string;
}

interface SalesRep {
  id: string;
  fullName: string;
}

type ConsignmentStatus = "draft" | "delivered" | "partially_settled" | "fully_settled" | "cancelled";

interface ConsignmentItem {
  id: string;
  materialId: string;
  quantityDelivered: string;
  quantitySold: string;
  quantityReturned: string;
  unitPrice: string;
  material: { name: string; sku: string };
}

interface Consignment {
  id: string;
  consignmentNumber: string;
  status: ConsignmentStatus;
  deliveryDate: string;
  customer: { id: string; name: string };
  warehouse: { id: string; name: string };
  salesRep: { fullName: string } | null;
  items: ConsignmentItem[];
}

const statusTones: Record<ConsignmentStatus, StatusTone> = {
  draft: "neutral",
  delivered: "info",
  partially_settled: "warning",
  fully_settled: "success",
  cancelled: "error",
};

const emptyConsignmentValues: ConsignmentFormValues = {
  customerId: "",
  warehouseId: "",
  items: [{ materialId: "", quantityDelivered: 0, unitPrice: 0 }],
};

function remaining(item: ConsignmentItem) {
  return Number(item.quantityDelivered) - Number(item.quantitySold) - Number(item.quantityReturned);
}

export function ConsignmentPanel() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const createForm = useForm<ConsignmentFormValues>({
    resolver: zodResolver(consignmentSchema),
    defaultValues: emptyConsignmentValues,
  });
  const { fields, append, remove } = useFieldArray({ control: createForm.control, name: "items" });

  function loadConsignments() {
    return fetchJson<{ rows: Consignment[]; pageCount: number }>(
      `/api/consignments?page=${page}&pageSize=50`
    ).then((data) => {
      setConsignments(data?.rows ?? []);
      setPageCount(data?.pageCount ?? 1);
      setLoading(false);
    });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadConsignments();
  }, [page]);

  useEffect(() => {
    fetchJson<Retailer[]>("/api/retailers").then((data) => setRetailers(data ?? []));
    fetchJson<{ warehouses: Warehouse[]; finishedGoods: FinishedGood[]; salesReps: SalesRep[] }>("/api/lookups").then((data) => {
      setWarehouses((data?.warehouses ?? []).filter((w) => !SYSTEM_WAREHOUSE_NAMES.has(w.name)));
      setFinishedGoods(data?.finishedGoods ?? []);
      setSalesReps(data?.salesReps ?? []);
    });
  }, []);

  function openCreateForm() {
    setFormError(null);
    createForm.reset(emptyConsignmentValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function onCreateSubmit(values: ConsignmentFormValues) {
    setFormError(null);
    const res = await fetch("/api/consignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save consignment. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadConsignments();
  }

  async function refreshAndKeepSelection() {
    await loadConsignments();
  }

  const columns: DataTableColumn<Consignment>[] = [
    {
      key: "number",
      header: "Consignment #",
      render: (c) => <span className="font-mono text-body-sm">{c.consignmentNumber}</span>,
    },
    { key: "retailer", header: "Retailer", render: (c) => c.customer.name },
    { key: "warehouse", header: "From", render: (c) => c.warehouse.name },
    { key: "items", header: "Line Items", render: (c) => c.items.length },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge label={c.status.replace(/_/g, " ")} tone={statusTones[c.status]} />,
    },
  ];

  const selected = consignments.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading consignments…" : `${consignments.length} consignment${consignments.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={retailers.length === 0 || finishedGoods.length === 0}>
          <Plus size={16} />
          New Consignment
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Consignment</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Retailer *
              <Select {...createForm.register("customerId")} error={!!createForm.formState.errors.customerId}>
                <option value="">Select retailer…</option>
                {retailers.map((r) => (
                  <option key={r.id} value={r.customerId}>
                    {r.retailerCode} — {r.customer.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              From Warehouse *
              <Select {...createForm.register("warehouseId")} error={!!createForm.formState.errors.warehouseId}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Sales Representative
              <Select {...createForm.register("salesRepId")}>
                <option value="">Unassigned</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">Items</h3>
              <Button type="button" variant="secondary" onClick={() => append({ materialId: "", quantityDelivered: 0, unitPrice: 0 })}>
                <Plus size={14} />
                Add Line
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_auto]">
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Product
                  <Select {...createForm.register(`items.${index}.materialId` as const)}>
                    <option value="">Select product…</option>
                    {finishedGoods.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Quantity
                  <Input type="number" min={0} step="0.001" {...createForm.register(`items.${index}.quantityDelivered` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Unit Price
                  <Input type="number" min={0} step="0.0001" {...createForm.register(`items.${index}.unitPrice` as const)} />
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

            {createForm.formState.errors.items?.message && (
              <p className="text-body-sm text-error">{createForm.formState.errors.items.message}</p>
            )}
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={createForm.formState.isSubmitting}>
              {createForm.formState.isSubmitting ? "Saving…" : "Save Draft"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={consignments}
        getRowKey={(c) => c.id}
        onRowClick={(c) => setSelectedId(c.id === selectedId ? null : c.id)}
        emptyMessage="No consignments yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />

      {selected && <ConsignmentDetail consignment={selected} onChanged={refreshAndKeepSelection} />}
    </div>
  );
}

function ConsignmentDetail({ consignment, onChanged }: { consignment: Consignment; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<"sale" | "return" | "payment" | null>(null);
  const [paymentsRefreshToken, setPaymentsRefreshToken] = useState(0);

  async function deliver() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/deliver`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not deliver consignment.");
      return;
    }
    await onChanged();
  }

  const itemColumns: DataTableColumn<ConsignmentItem>[] = [
    { key: "product", header: "Product", render: (i) => `${i.material.sku} — ${i.material.name}` },
    { key: "delivered", header: "Delivered", render: (i) => i.quantityDelivered },
    { key: "sold", header: "Sold", render: (i) => i.quantitySold },
    { key: "returned", header: "Returned", render: (i) => i.quantityReturned },
    { key: "remaining", header: "Held", render: (i) => remaining(i) },
    { key: "price", header: "Unit Price", render: (i) => Number(i.unitPrice).toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-md text-on-surface">{consignment.consignmentNumber}</h2>
        <div className="flex gap-sm">
          {consignment.status !== "draft" && (
            <a href={`/api/consignments/${consignment.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                <FileText size={16} />
                Delivery Note / Invoice
              </Button>
            </a>
          )}
          {consignment.status === "draft" && (
            <Button type="button" onClick={deliver} disabled={busy}>
              <Truck size={16} />
              {busy ? "Delivering…" : "Deliver"}
            </Button>
          )}
        </div>
      </div>

      <DataTable columns={itemColumns} rows={consignment.items} getRowKey={(i) => i.id} />

      {error && <p className="text-body-sm text-error">{error}</p>}

      {consignment.status !== "draft" && consignment.status !== "cancelled" && (
        <div className="flex flex-col gap-md">
          <div className="flex gap-sm">
            <Button type="button" variant="secondary" onClick={() => setOpenForm(openForm === "sale" ? null : "sale")}>
              Record Sale
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpenForm(openForm === "return" ? null : "return")}>
              Record Return
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpenForm(openForm === "payment" ? null : "payment")}>
              Record Payment
            </Button>
          </div>

          {openForm === "sale" && (
            <RecordSaleForm
              consignment={consignment}
              onDone={async () => {
                setOpenForm(null);
                await onChanged();
              }}
            />
          )}
          {openForm === "return" && (
            <RecordReturnForm
              consignment={consignment}
              onDone={async () => {
                setOpenForm(null);
                await onChanged();
              }}
            />
          )}
          {openForm === "payment" && (
            <RecordPaymentForm
              consignment={consignment}
              onDone={async () => {
                setOpenForm(null);
                setPaymentsRefreshToken((token) => token + 1);
                await onChanged();
              }}
            />
          )}

          <PaymentsList key={paymentsRefreshToken} consignmentId={consignment.id} />
        </div>
      )}
    </div>
  );
}

interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: string;
  paymentMethod: string;
  referenceNumber: string | null;
}

function PaymentsList({ consignmentId }: { consignmentId: string }) {
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);

  useEffect(() => {
    fetchJson<PaymentRecord[]>(`/api/payments?consignmentId=${consignmentId}`).then((data) => setPayments(data ?? []));
  }, [consignmentId]);

  if (!payments || payments.length === 0) return null;

  return (
    <div className="flex flex-col gap-xs">
      <h3 className="text-label-lg text-on-surface">Payments</h3>
      <div className="flex flex-col gap-xs">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between rounded-md border border-outline-variant px-sm py-xs text-body-sm"
          >
            <span>
              {new Date(payment.paymentDate).toLocaleDateString()} — {Number(payment.amount).toFixed(2)} (
              {payment.paymentMethod.replace(/_/g, " ")}
              {payment.referenceNumber ? `, ${payment.referenceNumber}` : ""})
            </span>
            <a href={`/api/payments/${payment.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="ghost">
                <FileText size={14} />
                Receipt
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordSaleForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const items = consignment.items
      .map((item) => ({ consignmentItemId: item.id, quantity: Number(quantities[item.id] ?? 0) }))
      .filter((entry) => entry.quantity > 0);

    if (items.length === 0) {
      setError("Enter at least one sold quantity.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not record sale.");
      return;
    }
    await onDone();
  }

  return (
    <div className="flex flex-col gap-sm rounded-md border border-outline-variant p-md">
      <h3 className="text-label-lg text-on-surface">Units Sold Since Last Report</h3>
      {consignment.items.map((item) => (
        <label key={item.id} className="flex items-center justify-between gap-sm text-body-sm text-on-surface-variant">
          <span>
            {item.material.name} <span className="text-on-surface-variant">(held: {remaining(item)})</span>
          </span>
          <Input
            type="number"
            min={0}
            step="0.001"
            className="w-32"
            value={quantities[item.id] ?? ""}
            onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
          />
        </label>
      ))}
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function RecordReturnForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const [rows, setRows] = useState<Record<string, { quantity: string; qualityStatus: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const items = consignment.items
      .map((item) => ({
        consignmentItemId: item.id,
        materialId: item.materialId,
        quantity: Number(rows[item.id]?.quantity ?? 0),
        qualityStatus: rows[item.id]?.qualityStatus || "good",
      }))
      .filter((entry) => entry.quantity > 0);

    if (items.length === 0) {
      setError("Enter at least one returned quantity.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: consignment.customer.id, items }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not record return.");
      return;
    }
    await onDone();
  }

  return (
    <div className="flex flex-col gap-sm rounded-md border border-outline-variant p-md">
      <h3 className="text-label-lg text-on-surface">Returned Units</h3>
      {consignment.items.map((item) => (
        <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr] items-center gap-sm text-body-sm text-on-surface-variant">
          <span>
            {item.material.name} <span>(held: {remaining(item)})</span>
          </span>
          <Input
            type="number"
            min={0}
            step="0.001"
            value={rows[item.id]?.quantity ?? ""}
            onChange={(e) =>
              setRows((prev) => ({ ...prev, [item.id]: { quantity: e.target.value, qualityStatus: prev[item.id]?.qualityStatus ?? "good" } }))
            }
          />
          <Select
            value={rows[item.id]?.qualityStatus ?? "good"}
            onChange={(e) =>
              setRows((prev) => ({ ...prev, [item.id]: { quantity: prev[item.id]?.quantity ?? "0", qualityStatus: e.target.value } }))
            }
          >
            {returnQualityStatusValues.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </div>
      ))}
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function RecordPaymentForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    defaultValues: { customerId: consignment.customer.id, consignmentId: consignment.id, amount: 0, paymentMethod: "cash" },
  });
  const [error, setError] = useState<string | null>(null);

  async function submit(values: PaymentFormValues) {
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setError("Could not record payment.");
      return;
    }
    await onDone();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-sm rounded-md border border-outline-variant p-md">
      <h3 className="text-label-lg text-on-surface">Record Payment</h3>
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
        <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
          Amount
          <Input type="number" min={0} step="0.01" {...register("amount")} error={!!errors.amount} />
        </label>
        <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
          Method
          <Select {...register("paymentMethod")}>
            {paymentMethodValues.map((method) => (
              <option key={method} value={method}>
                {method.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
          Reference #
          <Input {...register("referenceNumber")} />
        </label>
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
