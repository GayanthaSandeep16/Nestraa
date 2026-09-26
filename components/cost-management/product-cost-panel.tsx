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
import { productCostSchema, type ProductCostFormValues } from "@/lib/validation/product-cost";
import { errorMessage } from "@/lib/http";

interface Product {
  id: string;
  sku: string;
  name: string;
}

interface ProductCostRow {
  id: string;
  unitCost: string;
  unitPrice: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  material: Product;
}

const emptyValues: ProductCostFormValues = {
  materialId: "",
  unitCost: 0,
  unitPrice: 0,
  effectiveFrom: "",
  effectiveTo: "",
};

export function ProductCostPanel() {
  const [rows, setRows] = useState<ProductCostRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProductCostFormValues>({
    resolver: zodResolver(productCostSchema),
    defaultValues: emptyValues,
  });

  function loadRows() {
    return fetch(`/api/product-cost?page=${page}&pageSize=50`)
      .then((res) => (res.ok ? res.json() : { rows: [], pageCount: 1 }))
      .then((data) => {
        setRows(data.rows ?? []);
        setPageCount(data.pageCount ?? 1);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/products").then((res) => res.json()).then(setProducts);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadRows();
  }, [page]);

  function openForm() {
    setFormError(null);
    form.reset(emptyValues);
    setFormOpen(true);
  }

  async function onSubmit(values: ProductCostFormValues) {
    setFormError(null);
    const res = await fetch("/api/product-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(
        typeof body?.error === "string"
          ? body.error
          : "Could not save the cost/price. Check the fields and try again."
      );
      return;
    }
    setFormOpen(false);
    await loadRows();
  }

  async function endCost(id: string) {
    if (!confirm("End this cost/price today? It will stop applying from tomorrow.")) return;
    const today = new Date().toLocaleDateString("en-CA");
    const res = await fetch(`/api/product-cost/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effectiveTo: today }),
    });
    if (!res.ok) alert(await errorMessage(res, "Could not end this cost."));
    await loadRows();
  }

  const columns: DataTableColumn<ProductCostRow>[] = [
    { key: "product", header: "Product", render: (row) => `${row.material.sku} — ${row.material.name}` },
    { key: "cost", header: "Unit Cost", render: (row) => Number(row.unitCost).toFixed(4) },
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
            aria-label={`End cost/price for ${row.material.name}`}
            title="End this cost/price today"
            onClick={() => endCost(row.id)}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <CalendarOff size={16} />
          </button>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-lg p-md md:p-lg">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading costs…" : `${rows.length} product cost${rows.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openForm} disabled={products.length === 0}>
          <Plus size={16} />
          New Product Cost
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Product Cost</h2>
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
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant sm:col-span-2">
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
              Unit Cost *
              <Input type="number" min={0} step="0.0001" {...form.register("unitCost")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Unit Price *
              <Input type="number" min={0} step="0.0001" {...form.register("unitPrice")} />
            </label>

            <div className="grid grid-cols-2 gap-sm sm:col-span-2">
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
        emptyMessage="No product costs set yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
