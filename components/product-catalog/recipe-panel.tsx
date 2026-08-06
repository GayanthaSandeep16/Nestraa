"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { recipeSchema, type RecipeFormValues } from "@/lib/validation/recipes";

interface RecipeIngredient {
  id: string;
  materialId: string;
  uomId: string;
  percentage: string | null;
  fixedQuantity: string | null;
  material: { id: string; sku: string; name: string };
  uom: { id: string; code: string };
}

interface Recipe {
  id: string;
  name: string;
  outputMaterialId: string;
  version: number;
  isActive: boolean;
  outputMaterial: { id: string; sku: string; name: string };
  ingredients: RecipeIngredient[];
}

interface Material {
  id: string;
  sku: string;
  name: string;
}

interface Lookups {
  unitsOfMeasure: { id: string; code: string; name: string }[];
}

const emptyIngredient = { materialId: "", uomId: "", percentage: "" as number | "", fixedQuantity: "" as number | "" };

const emptyValues: RecipeFormValues = {
  name: "",
  outputMaterialId: "",
  version: 1,
  ingredients: [emptyIngredient],
};

export function RecipePanel() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Material[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lookups, setLookups] = useState<Lookups>({ unitsOfMeasure: [] });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: emptyValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const ingredientValues = watch("ingredients");
  const percentageSum = (ingredientValues ?? []).reduce((sum, ing) => {
    const value = Number(ing?.percentage);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  function loadRecipes() {
    return fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => {
        setRecipes(data);
        setLoading(false);
      });
  }

  function loadProducts() {
    return fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data));
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
    loadRecipes();
    loadProducts();
    loadMaterials();
    loadLookups();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(recipe: Recipe) {
    setEditingId(recipe.id);
    setFormError(null);
    reset({
      name: recipe.name,
      outputMaterialId: recipe.outputMaterialId,
      version: recipe.version,
      ingredients: recipe.ingredients.map((ing) => ({
        materialId: ing.materialId,
        uomId: ing.uomId,
        percentage: ing.percentage !== null ? Number(ing.percentage) : "",
        fixedQuantity: ing.fixedQuantity !== null ? Number(ing.fixedQuantity) : "",
      })),
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function onSubmit(values: RecipeFormValues) {
    setFormError(null);
    const url = editingId ? `/api/recipes/${editingId}` : "/api/recipes";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save recipe. Each ingredient needs either a percentage or a fixed quantity, not both.");
      return;
    }

    closeForm();
    await loadRecipes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recipe? This cannot be undone.")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    await loadRecipes();
  }

  const columns: DataTableColumn<Recipe>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "output", header: "Output Product", render: (r) => `${r.outputMaterial.name} (${r.outputMaterial.sku})` },
    { key: "version", header: "Version", render: (r) => `v${r.version}` },
    { key: "ingredients", header: "Ingredients", render: (r) => r.ingredients.length },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge label={r.isActive ? "Active" : "Inactive"} tone={r.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${r.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(r);
            }}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${r.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r.id);
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
          {loading ? "Loading recipes…" : `${recipes.length} recipe${recipes.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={products.length === 0}>
          <Plus size={16} />
          New Recipe
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Recipe" : "New Recipe"}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Name *
              <Input {...register("name")} error={!!errors.name} />
              {errors.name && <span className="text-body-sm text-error">{errors.name.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Output Product *
              <Select {...register("outputMaterialId")} error={!!errors.outputMaterialId}>
                <option value="">Select product…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </Select>
              {errors.outputMaterialId && <span className="text-body-sm text-error">{errors.outputMaterialId.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Version
              <Input type="number" min={1} {...register("version")} />
            </label>
          </div>

          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-label-lg text-on-surface">
                Ingredients {percentageSum > 0 && <span className="text-on-surface-variant">(sum: {percentageSum}%)</span>}
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={() => append(emptyIngredient)}
              >
                <Plus size={14} />
                Add Ingredient
              </Button>
            </div>

            {errors.ingredients?.root && <p className="text-body-sm text-error">{errors.ingredients.root.message}</p>}
            {errors.ingredients?.message && <p className="text-body-sm text-error">{errors.ingredients.message}</p>}

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Material
                  <Select {...register(`ingredients.${index}.materialId` as const)} error={!!errors.ingredients?.[index]?.materialId}>
                    <option value="">Select material…</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.sku})
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  UoM
                  <Select {...register(`ingredients.${index}.uomId` as const)} error={!!errors.ingredients?.[index]?.uomId}>
                    <option value="">Unit…</option>
                    {lookups.unitsOfMeasure.map((uom) => (
                      <option key={uom.id} value={uom.id}>
                        {uom.code}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Percentage
                  <Input type="number" min={0} max={100} step="0.001" {...register(`ingredients.${index}.percentage` as const)} />
                </label>

                <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                  Fixed Qty
                  <Input type="number" min={0} step="0.001" {...register(`ingredients.${index}.fixedQuantity` as const)} />
                </label>

                <button
                  type="button"
                  aria-label="Remove ingredient"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  className="self-end rounded-md p-xs text-error hover:bg-error-container disabled:opacity-40"
                >
                  <Trash2 size={16} />
                </button>

                {errors.ingredients?.[index]?.percentage && (
                  <p className="col-span-full text-body-sm text-error">{errors.ingredients[index]?.percentage?.message}</p>
                )}
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
        rows={recipes}
        getRowKey={(r) => r.id}
        onRowClick={openEditForm}
        emptyMessage="No recipes yet. Add your first blend recipe to get started."
      />
    </div>
  );
}
