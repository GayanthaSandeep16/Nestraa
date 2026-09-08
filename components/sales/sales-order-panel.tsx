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
import { salesOrderSchema, type SalesOrderFormValues } from "@/lib/validation/sales-orders";

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  baseUomId: string;
}

interface SalesOrderItem {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  material: Product;
}

interface SalesOrder {
  id: string;
  orderNo: string;
  status: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled";
  orderDate: string;
  customer: Customer;
  items: SalesOrderItem[];
}

const statusTones: Record<SalesOrder["status"], StatusTone> = {
  draft: "neutral",
  pending_approval: "info",
  approved: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const emptyValues: SalesOrderFormValues = {
  customerId: "",
  items: [{ materialId: "", quantity: 0, unitPrice: 0, discountPct: 0 }],
};

function lineTotal(item: { quantity: number | string; unitPrice: number | string; discountPct?: number | string }) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  const discount = Number(item.discountPct) || 0;
  return qty * price * (1 - discount / 100);
}

function orderTotal(order: SalesOrder) {
  return order.items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function SalesOrderPanel() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const createForm = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: emptyValues,
  });
  const { fields, append, remove } = useFieldArray({ control: createForm.control, name: "items" });

  function loadOrders() {
    return fetch(`/api/sales-orders?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  function loadCustomers() {
    return fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => setCustomers(data));
  }

  function loadProducts() {
    return fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadOrders();
  }, [page]);

  async function prefillPrice(index: number, materialId: string) {
    const customerId = createForm.watch("customerId");
    if (!customerId || !materialId) return;
    if (Number(createForm.watch(`items.${index}.unitPrice`)) > 0) return;
    const res = await fetch(
      `/api/customer-pricing/effective?customerId=${customerId}&materialId=${materialId}`
    );
    if (!res.ok) return;
    const { unitPrice } = await res.json();
    if (unitPrice) createForm.setValue(`items.${index}.unitPrice`, Number(unitPrice));
  }

  function openCreateForm() {
    setFormError(null);
    createForm.reset(emptyValues);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setFormError(null);
  }

  async function onCreateSubmit(values: SalesOrderFormValues) {
    setFormError(null);
    const res = await fetch("/api/sales-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save sales order. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadOrders();
  }

  async function setStatus(id: string, status: "completed" | "cancelled") {
    if (status === "cancelled" && !confirm("Cancel this sales order?")) return;
    await fetch(`/api/sales-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadOrders();
  }

  const columns: DataTableColumn<SalesOrder>[] = [
    { key: "orderNo", header: "Order #", render: (order) => <span className="font-mono text-body-sm">{order.orderNo}</span> },
    { key: "customer", header: "Customer", render: (order) => order.customer.name },
    { key: "items", header: "Line Items", render: (order) => order.items.length },
    { key: "total", header: "Total", render: (order) => orderTotal(order).toFixed(2) },
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
                  setStatus(order.id, "completed");
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
                  setStatus(order.id, "cancelled");
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
          {loading ? "Loading sales orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={customers.length === 0 || products.length === 0}>
          <Plus size={16} />
          New Sales Order
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Sales Order</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
            Customer *
            <Select {...createForm.register("customerId")} error={!!createForm.formState.errors.customerId}>
              <option value="">Select customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
            {createForm.formState.errors.customerId && (
              <span className="text-body-sm text-error">{createForm.formState.errors.customerId.message}</span>
            )}
          </label>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">Line Items</h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append({ materialId: "", quantity: 0, unitPrice: 0, discountPct: 0 })}
              >
                <Plus size={14} />
                Add Line
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Product
                  <Select
                    {...createForm.register(`items.${index}.materialId` as const)}
                    onChange={(e) => {
                      createForm.setValue(`items.${index}.materialId`, e.target.value);
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
                  <Input type="number" min={0} step="0.001" {...createForm.register(`items.${index}.quantity` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Unit Price
                  <Input type="number" min={0} step="0.0001" {...createForm.register(`items.${index}.unitPrice` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Discount %
                  <Input type="number" min={0} max={100} step="0.01" {...createForm.register(`items.${index}.discountPct` as const)} />
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
              {createForm.formState.isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={orders}
        getRowKey={(order) => order.id}
        emptyMessage="No sales orders yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
