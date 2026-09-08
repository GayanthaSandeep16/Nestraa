"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { customerPricingSchema, type CustomerPricingFormValues } from "@/lib/validation/customer-pricing";

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface PriceRow {
  id: string;
  unitPrice: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  customer: Customer;
  material: Product;
}

const emptyValues: CustomerPricingFormValues = {
  customerId: "",
  materialId: "",
  unitPrice: 0,
  effectiveFrom: "",
  effectiveTo: "",
};

export function PricingPanel() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CustomerPricingFormValues>({
    resolver: zodResolver(customerPricingSchema),
    defaultValues: emptyValues,
  });

  function loadRows() {
    return fetch("/api/customer-pricing")
      .then((res) => res.json())
      .then((data) => {
        setRows(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadRows();
    fetch("/api/customers").then((res) => res.json()).then(setCustomers);
    fetch("/api/products").then((res) => res.json()).then(setProducts);
  }, []);

  function openForm() {
    setFormError(null);
    form.reset(emptyValues);
    setFormOpen(true);
  }

  async function onSubmit(values: CustomerPricingFormValues) {
    setFormError(null);
    const res = await fetch("/api/customer-pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string"
          ? body.error
          : "Could not save the price. Check the fields and try again."
      );
      return;
    }
    setFormOpen(false);
    await loadRows();
  }

  async function endPrice(id: string) {
    const today = new Date().toISOString().slice(0, 10);
    await fetch(`/api/customer-pricing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectiveTo: today }),
    });
    await loadRows();
  }

  const columns: DataTableColumn<PriceRow>[] = [
    { key: "customer", header: "Customer", render: (row) => row.customer.name },
    { key: "product", header: "Product", render: (row) => `${row.material.sku} — ${row.material.name}` },
    { key: "price", header: "Unit Price", render: (row) => Number(row.unitPrice).toFixed(4) },
    {
      key: "from",
      header: "Effective From",
      render: (row) => new Date(row.effectiveFrom).toLocaleDateString(),
    },
    {
      key: "to",
      header: "Effective To",
      render: (row) =>
        row.effectiveTo ? (
          new Date(row.effectiveTo).toLocaleDateString()
        ) : (
          <StatusBadge label="open" tone="success" />
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        row.effectiveTo ? null : (
          <button
            type="button"
            aria-label={`End price for ${row.customer.name} / ${row.material.name}`}
            title="End this price today"
            onClick={() => endPrice(row.id)}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <CalendarOff size={16} />
          </button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading prices…" : `${rows.length} price${rows.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openForm} disabled={customers.length === 0 || products.length === 0}>
          <Plus size={16} />
          New Price
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Customer Price</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Close form"
              className="text-on-surface-variant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
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
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Product *
              <Select {...form.register("materialId")} error={!!form.formState.errors.materialId}>
                <option value="">Select product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.sku} — {product.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Unit Price *
              <Input type="number" min={0} step="0.0001" {...form.register("unitPrice")} />
            </label>

            <div className="grid grid-cols-2 gap-sm">
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Effective From
                <Input type="date" {...form.register("effectiveFrom")} />
              </label>
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Effective To
                <Input type="date" {...form.register("effectiveTo")} />
              </label>
            </div>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
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
        rows={rows}
        getRowKey={(row) => row.id}
        emptyMessage="No customer-specific prices yet."
      />
    </div>
  );
}
