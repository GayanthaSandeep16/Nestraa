"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { productSchema, type ProductFormValues } from "@/lib/validation/products";
import { errorMessage } from "@/lib/http";

interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  baseUomId: string;
  reorderLevel: string;
  reorderQty: string;
  shelfLifeDays: number | null;
  isActive: boolean;
  baseUom: { id: string; code: string; name: string };
  category: { id: string; name: string } | null;
}

interface Lookups {
  unitsOfMeasure: { id: string; code: string; name: string }[];
  categories: { id: string; name: string }[];
}

const emptyValues: ProductFormValues = {
  name: "",
  categoryId: "",
  baseUomId: "",
  reorderLevel: 0,
  reorderQty: 0,
  shelfLifeDays: "",
};

export function ProductPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ unitsOfMeasure: [], categories: [] });
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  });

  function loadProducts() {
    return fetch(`/api/products?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  function loadLookups() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setLookups(data));
  }

  useEffect(() => {
    loadLookups();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadProducts();
  }, [page]);

  function openCreateForm() {
    setEditingId(null);
    setEditingSku(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingId(product.id);
    setEditingSku(product.sku);
    setFormError(null);
    reset({
      name: product.name,
      categoryId: product.categoryId ?? "",
      baseUomId: product.baseUomId,
      reorderLevel: Number(product.reorderLevel),
      reorderQty: Number(product.reorderQty),
      shelfLifeDays: product.shelfLifeDays ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setEditingSku(null);
    setFormError(null);
  }

  async function onSubmit(values: ProductFormValues) {
    setFormError(null);
    const url = editingId ? `/api/products/${editingId}` : "/api/products";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError(await errorMessage(res, "Could not save product. Check the fields and try again."));
      return;
    }

    closeForm();
    await loadProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this product? It will no longer appear in the list.")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  }

  const columns: DataTableColumn<Product>[] = [
    { key: "sku", header: "SKU", render: (p) => <span className="font-mono text-body-sm">{p.sku}</span> },
    { key: "name", header: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "uom", header: "Base UoM", render: (p) => p.baseUom.code },
    { key: "category", header: "Category", render: (p) => p.category?.name ?? "—" },
    { key: "reorder", header: "Reorder Level / Qty", render: (p) => `${p.reorderLevel} / ${p.reorderQty}` },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge label={p.isActive ? "Active" : "Inactive"} tone={p.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${p.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(p);
            }}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${p.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            className="rounded-md p-xs text-error hover:bg-error-container"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading products…" : `${products.length} product${products.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={lookups.unitsOfMeasure.length === 0}>
          <Plus size={16} />
          New Product
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Product" : "New Product"}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {editingSku && (
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                SKU
                <Input value={editingSku} disabled readOnly />
              </label>
            )}

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Name *
              <Input {...register("name")} error={!!errors.name} />
              {errors.name && <span className="text-body-sm text-error">{errors.name.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Base Unit of Measure *
              <Select {...register("baseUomId")} error={!!errors.baseUomId}>
                <option value="">Select unit…</option>
                {lookups.unitsOfMeasure.map((uom) => (
                  <option key={uom.id} value={uom.id}>
                    {uom.code} — {uom.name}
                  </option>
                ))}
              </Select>
              {errors.baseUomId && <span className="text-body-sm text-error">{errors.baseUomId.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Category
              <Select {...register("categoryId")}>
                <option value="">No category</option>
                {lookups.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Shelf Life (days)
              <Input type="number" min={0} {...register("shelfLifeDays")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Reorder Level
              <Input type="number" min={0} step="0.001" {...register("reorderLevel")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Reorder Quantity
              <Input type="number" min={0} step="0.001" {...register("reorderQty")} />
            </label>
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
        rows={products}
        getRowKey={(p) => p.id}
        onRowClick={openEditForm}
        emptyMessage="No products yet. Add your first finished product to get started."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
