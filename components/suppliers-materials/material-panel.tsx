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
import { materialSchema, materialTypeValues, type MaterialFormValues } from "@/lib/validation/materials";

const materialTypeLabels: Record<(typeof materialTypeValues)[number], string> = {
  raw: "Raw",
  processed: "Processed",
  finished_good: "Finished Good",
};

interface Material {
  id: string;
  sku: string;
  name: string;
  materialType: (typeof materialTypeValues)[number];
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

const emptyValues: MaterialFormValues = {
  name: "",
  materialType: "raw",
  categoryId: "",
  baseUomId: "",
  reorderLevel: 0,
  reorderQty: 0,
  shelfLifeDays: "",
};

export function MaterialPanel() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ unitsOfMeasure: [], categories: [] });
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
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: emptyValues,
  });

  function loadMaterials() {
    return fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => {
        setMaterials(data);
        setLoading(false);
      });
  }

  function loadLookups() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setLookups(data));
  }

  useEffect(() => {
    loadMaterials();
    loadLookups();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setEditingSku(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(material: Material) {
    setEditingId(material.id);
    setEditingSku(material.sku);
    setFormError(null);
    reset({
      name: material.name,
      materialType: material.materialType,
      categoryId: material.categoryId ?? "",
      baseUomId: material.baseUomId,
      reorderLevel: Number(material.reorderLevel),
      reorderQty: Number(material.reorderQty),
      shelfLifeDays: material.shelfLifeDays ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setEditingSku(null);
    setFormError(null);
  }

  async function onSubmit(values: MaterialFormValues) {
    setFormError(null);
    const url = editingId ? `/api/materials/${editingId}` : "/api/materials";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save material. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadMaterials();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this material? It will no longer appear in the list.")) return;
    await fetch(`/api/materials/${id}`, { method: "DELETE" });
    await loadMaterials();
  }

  const columns: DataTableColumn<Material>[] = [
    { key: "sku", header: "SKU", render: (m) => <span className="font-mono text-body-sm">{m.sku}</span> },
    { key: "name", header: "Name", render: (m) => <span className="font-medium">{m.name}</span> },
    { key: "type", header: "Type", render: (m) => materialTypeLabels[m.materialType] },
    { key: "uom", header: "Base UoM", render: (m) => m.baseUom.code },
    { key: "category", header: "Category", render: (m) => m.category?.name ?? "—" },
    { key: "reorder", header: "Reorder Level / Qty", render: (m) => `${m.reorderLevel} / ${m.reorderQty}` },
    {
      key: "status",
      header: "Status",
      render: (m) => <StatusBadge label={m.isActive ? "Active" : "Inactive"} tone={m.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (m) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${m.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(m);
            }}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${m.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(m.id);
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
          {loading ? "Loading materials…" : `${materials.length} material${materials.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={lookups.unitsOfMeasure.length === 0}>
          <Plus size={16} />
          New Material
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Material" : "New Material"}</h2>
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
              Material Type *
              <Select {...register("materialType")}>
                {materialTypeValues.map((value) => (
                  <option key={value} value={value}>
                    {materialTypeLabels[value]}
                  </option>
                ))}
              </Select>
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
        rows={materials}
        getRowKey={(m) => m.id}
        onRowClick={openEditForm}
        emptyMessage="No materials yet. Add your first material to get started."
      />
    </div>
  );
}
