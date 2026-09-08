"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, Truck, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { salesInvoiceSchema, type SalesInvoiceFormValues } from "@/lib/validation/sales-invoices";

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface AvailableBatch {
  id: string;
  batchNo: string;
  remainingQuantity: string;
  uom: { code: string };
}

interface SalesOrder {
  id: string;
  orderNo: string;
  status: string;
  customer: Customer;
  items: { materialId: string; quantity: string; unitPrice: string; discountPct: string }[];
}

interface Invoice {
  id: string;
  invoiceNo: string;
  status: string;
  invoiceDate: string;
  totalAmount: string;
  taxAmount: string;
  customer: Customer;
  salesOrder: { id: string; orderNo: string } | null;
  items: { id: string; quantity: string; unitPrice: string; material: Product }[];
}

const statusTones: Record<string, StatusTone> = {
  paid: "success",
  partially_paid: "info",
  unpaid: "warning",
};

const today = () => new Date().toLocaleDateString("en-CA");

const emptyValues: SalesInvoiceFormValues = {
  customerId: "",
  salesOrderId: "",
  invoiceDate: today(),
  taxAmount: 0,
  items: [{ materialId: "", quantity: 0, unitPrice: 0, warehouseId: "", batchId: "" }],
};

function netUnitPrice(item: { unitPrice: string; discountPct: string }) {
  return Number(item.unitPrice) * (1 - Number(item.discountPct) / 100);
}

export function InvoicePanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [batchesByLine, setBatchesByLine] = useState<Record<number, AvailableBatch[]>>({});
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: emptyValues,
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });

  const taxAmount = Number(form.watch("taxAmount")) || 0;
  const watchedItems = form.watch("items");
  const subtotal = watchedItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  function loadInvoices() {
    return fetch(`/api/sales-invoices?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadInvoices();
  }, [page]);

  useEffect(() => {
    fetch("/api/customers").then((res) => res.json()).then(setCustomers);
    fetch("/api/products").then((res) => res.json()).then(setProducts);
    fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses ?? []));
    fetch("/api/sales-orders")
      .then((res) => res.json())
      .then((data: SalesOrder[]) => setOrders(data.filter((order) => order.status === "completed")));
  }, []);

  function openCreateForm() {
    setFormError(null);
    setBatchesByLine({});
    form.reset({ ...emptyValues, invoiceDate: today() });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  function loadBatchesForLine(index: number, materialId: string, warehouseId: string) {
    if (!materialId || !warehouseId) {
      setBatchesByLine((prev) => ({ ...prev, [index]: [] }));
      return;
    }
    fetch(`/api/inventory/batches/available?materialId=${materialId}&warehouseId=${warehouseId}`)
      .then((res) => res.json())
      .then((data: AvailableBatch[]) => setBatchesByLine((prev) => ({ ...prev, [index]: data })));
  }

  async function prefillPrice(index: number, materialId: string) {
    const customerId = form.watch("customerId");
    if (!customerId || !materialId) return;
    if (Number(form.watch(`items.${index}.unitPrice`)) > 0) return;
    const res = await fetch(
      `/api/customer-pricing/effective?customerId=${customerId}&materialId=${materialId}`
    );
    if (!res.ok) return;
    const { unitPrice } = await res.json();
    if (unitPrice) form.setValue(`items.${index}.unitPrice`, Number(unitPrice));
  }

  function onSelectOrder(orderId: string) {
    form.setValue("salesOrderId", orderId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    form.setValue("customerId", order.customer.id);
    setBatchesByLine({});
    replace(
      order.items.map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
        unitPrice: Number(netUnitPrice(item).toFixed(4)),
        warehouseId: "",
        batchId: "",
      }))
    );
  }

  async function onSubmit(values: SalesInvoiceFormValues) {
    setFormError(null);
    const res = await fetch("/api/sales-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save invoice. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadInvoices();
  }

  async function createDeliveryNote(invoiceId: string) {
    const res = await fetch("/api/delivery-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });
    if (res.ok) await loadInvoices();
  }

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      render: (invoice) => <span className="font-mono text-body-sm">{invoice.invoiceNo}</span>,
    },
    { key: "customer", header: "Customer", render: (invoice) => invoice.customer.name },
    { key: "so", header: "From SO", render: (invoice) => invoice.salesOrder?.orderNo ?? "—" },
    {
      key: "date",
      header: "Date",
      render: (invoice) => new Date(invoice.invoiceDate).toLocaleDateString(),
    },
    { key: "items", header: "Lines", render: (invoice) => invoice.items.length },
    { key: "tax", header: "Tax", render: (invoice) => Number(invoice.taxAmount).toFixed(2) },
    { key: "total", header: "Total", render: (invoice) => Number(invoice.totalAmount).toFixed(2) },
    {
      key: "status",
      header: "Status",
      render: (invoice) => (
        <StatusBadge label={invoice.status.replace(/_/g, " ")} tone={statusTones[invoice.status] ?? "neutral"} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (invoice) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Print invoice ${invoice.invoiceNo}`}
            title="Print invoice"
            onClick={() => window.open(`/api/sales-invoices/${invoice.id}/pdf`, "_blank")}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Printer size={16} />
          </button>
          <button
            type="button"
            aria-label={`Create delivery note for ${invoice.invoiceNo}`}
            title="Create delivery note"
            onClick={() => createDeliveryNote(invoice.id)}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Truck size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading invoices…" : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={customers.length === 0 || products.length === 0}>
          <Plus size={16} />
          New Invoice
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Invoice</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <input type="hidden" {...form.register("salesOrderId")} />
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              From Sales Order
              <Select value={form.watch("salesOrderId") ?? ""} onChange={(e) => onSelectOrder(e.target.value)}>
                <option value="">Standalone (walk-in) invoice…</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNo} — {order.customer.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Customer *
              <Select {...form.register("customerId")} error={!!form.formState.errors.customerId}>
                <option value="">Select customer…</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
              {form.formState.errors.customerId && (
                <span className="text-body-sm text-error">{form.formState.errors.customerId.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Invoice Date
              <Input type="date" {...form.register("invoiceDate")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Tax Amount
              <Input type="number" min={0} step="0.01" {...form.register("taxAmount")} />
            </label>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">Line Items</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ materialId: "", quantity: 0, unitPrice: 0, warehouseId: "", batchId: "" })}
              >
                <Plus size={14} />
                Add Line
              </Button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Pick a warehouse (and optionally a batch) on a line to ship stock out for it. Leave the warehouse
              blank for walk-in lines that don&apos;t move inventory.
            </p>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_1.5fr_1.5fr_auto]"
              >
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Product
                  <Select
                    {...form.register(`items.${index}.materialId` as const)}
                    onChange={(e) => {
                      form.setValue(`items.${index}.materialId`, e.target.value);
                      form.setValue(`items.${index}.batchId`, "");
                      loadBatchesForLine(index, e.target.value, form.watch(`items.${index}.warehouseId`) ?? "");
                      prefillPrice(index, e.target.value);
                    }}
                  >
                    <option value="">Select product…</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} — {product.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Quantity
                  <Input type="number" min={0} step="0.001" {...form.register(`items.${index}.quantity` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Unit Price
                  <Input type="number" min={0} step="0.0001" {...form.register(`items.${index}.unitPrice` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Warehouse
                  <Select
                    {...form.register(`items.${index}.warehouseId` as const)}
                    onChange={(e) => {
                      form.setValue(`items.${index}.warehouseId`, e.target.value);
                      form.setValue(`items.${index}.batchId`, "");
                      loadBatchesForLine(index, form.watch(`items.${index}.materialId`), e.target.value);
                    }}
                  >
                    <option value="">— none —</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Batch
                  <Select {...form.register(`items.${index}.batchId` as const)} disabled={!(batchesByLine[index]?.length)}>
                    <option value="">— any —</option>
                    {(batchesByLine[index] ?? []).map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNo} ({batch.remainingQuantity} {batch.uom.code})
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

            {form.formState.errors.items?.message && (
              <p className="text-body-sm text-error">{form.formState.errors.items.message}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-xs text-body-sm text-on-surface-variant">
            <span>Subtotal: {subtotal.toFixed(2)}</span>
            <span>Tax: {taxAmount.toFixed(2)}</span>
            <span className="text-body-md font-medium text-on-surface">Total: {(subtotal + taxAmount).toFixed(2)}</span>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(invoice) => invoice.id}
        emptyMessage="No invoices yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
