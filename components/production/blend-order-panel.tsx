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
import { qcResultValues } from "@/lib/validation/grns";
import {
  blendOrderSchema,
  blendOrderCompletionSchema,
  type BlendOrderFormValues,
  type BlendOrderCompletionFormValues,
} from "@/lib/validation/blend-orders";

interface Material {
  id: string;
  sku: string;
  name: string;
  baseUomId: string;
}

interface RecipeIngredient {
  id: string;
  materialId: string;
  percentage: string | null;
  fixedQuantity: string | null;
  material: Material;
  uom: { id: string; code: string };
}

interface Recipe {
  id: string;
  name: string;
  outputMaterial: Material;
  ingredients: RecipeIngredient[];
}

interface BlendOrder {
  id: string;
  orderNo: string;
  plannedQuantity: string;
  status: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled";
  recipe: Recipe;
}

interface AvailableBatch {
  id: string;
  batchNo: string;
  remainingQuantity: string;
  uom: { id: string; code: string };
}

interface Warehouse {
  id: string;
  name: string;
}

interface StockRow {
  material: { id: string } | null;
  quantityOnHand: string;
}

const statusTones: Record<BlendOrder["status"], StatusTone> = {
  draft: "neutral",
  pending_approval: "info",
  approved: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "error",
};

const qcResultLabels: Record<(typeof qcResultValues)[number], string> = {
  pass: "Pass",
  fail: "Fail",
  conditional_pass: "Conditional Pass",
};

const emptyValues: BlendOrderFormValues = {
  recipeId: "",
  plannedQuantity: 0,
};

function requiredQuantity(ingredient: RecipeIngredient, plannedQuantity: number) {
  if (ingredient.fixedQuantity) return Number(ingredient.fixedQuantity);
  if (ingredient.percentage) return (Number(ingredient.percentage) / 100) * plannedQuantity;
  return 0;
}

export function BlendOrderPanel() {
  const [orders, setOrders] = useState<BlendOrder[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentStock, setCurrentStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [completingOrder, setCompletingOrder] = useState<BlendOrder | null>(null);
  const [availableBatchesByMaterial, setAvailableBatchesByMaterial] = useState<Record<string, AvailableBatch[]>>({});
  const [completionError, setCompletionError] = useState<string | null>(null);

  const createForm = useForm<BlendOrderFormValues>({
    resolver: zodResolver(blendOrderSchema),
    defaultValues: emptyValues,
  });

  const completionForm = useForm<BlendOrderCompletionFormValues>({
    resolver: zodResolver(blendOrderCompletionSchema),
  });
  const { fields, append, remove } = useFieldArray({ control: completionForm.control, name: "inputs" });

  const selectedRecipeId = createForm.watch("recipeId");
  const plannedQuantity = Number(createForm.watch("plannedQuantity")) || 0;
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId);

  function loadOrders() {
    return fetch("/api/blend-orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }

  function loadRecipes() {
    return fetch("/api/recipes")
      .then((res) => res.json())
      .then((data) => setRecipes(data));
  }

  function loadWarehouses() {
    return fetch("/api/lookups")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses ?? []));
  }

  useEffect(() => {
    loadOrders();
    loadRecipes();
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (!selectedRecipe) {
      setCurrentStock([]);
      return;
    }
    fetch("/api/inventory/stock")
      .then((res) => res.json())
      .then(setCurrentStock);
  }, [selectedRecipe]);

  function stockFor(materialId: string) {
    return currentStock
      .filter((row) => row.material?.id === materialId)
      .reduce((sum, row) => sum + Number(row.quantityOnHand), 0);
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

  async function onCreateSubmit(values: BlendOrderFormValues) {
    setFormError(null);
    const res = await fetch("/api/blend-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save blend order. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadOrders();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this blend order?")) return;
    await fetch(`/api/blend-orders/${id}`, { method: "PATCH" });
    await loadOrders();
  }

  async function openCompleteForm(order: BlendOrder) {
    setCompletionError(null);

    const batchesByMaterial: Record<string, AvailableBatch[]> = {};
    await Promise.all(
      order.recipe.ingredients.map(async (ingredient) => {
        const res = await fetch(`/api/inventory/batches/available?materialId=${ingredient.materialId}`);
        batchesByMaterial[ingredient.materialId] = await res.json();
      })
    );
    setAvailableBatchesByMaterial(batchesByMaterial);

    completionForm.reset({
      inputs: order.recipe.ingredients.map((ingredient) => ({
        materialId: ingredient.materialId,
        batchId: "",
        quantity: 0,
        uomId: ingredient.uom.id,
      })),
      output: { quantity: 0, uomId: order.recipe.outputMaterial.baseUomId, warehouseId: "", qcResult: "" },
    });
    setCompletingOrder(order);
  }

  function closeCompleteForm() {
    setCompletingOrder(null);
    setCompletionError(null);
    setAvailableBatchesByMaterial({});
  }

  async function onCompleteSubmit(values: BlendOrderCompletionFormValues) {
    if (!completingOrder) return;
    setCompletionError(null);

    const res = await fetch(`/api/blend-orders/${completingOrder.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setCompletionError("Could not complete the order. Check the fields and try again.");
      return;
    }

    closeCompleteForm();
    await loadOrders();
  }

  const columns: DataTableColumn<BlendOrder>[] = [
    { key: "orderNo", header: "Order #", render: (order) => <span className="font-mono text-body-sm">{order.orderNo}</span> },
    { key: "recipe", header: "Recipe", render: (order) => order.recipe.name },
    { key: "output", header: "Output Material", render: (order) => order.recipe.outputMaterial.name },
    { key: "plannedQuantity", header: "Planned Qty", render: (order) => order.plannedQuantity },
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
                  openCompleteForm(order);
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
                  cancelOrder(order.id);
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
          {loading ? "Loading blend orders…" : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm} disabled={recipes.length === 0}>
          <Plus size={16} />
          New Blend Order
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={createForm.handleSubmit(onCreateSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Blend Order</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Recipe *
              <Select {...createForm.register("recipeId")} error={!!createForm.formState.errors.recipeId}>
                <option value="">Select recipe…</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} → {recipe.outputMaterial.name}
                  </option>
                ))}
              </Select>
              {createForm.formState.errors.recipeId && (
                <span className="text-body-sm text-error">{createForm.formState.errors.recipeId.message}</span>
              )}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Planned Quantity *
              <Input type="number" min={0} step="0.001" {...createForm.register("plannedQuantity")} />
            </label>
          </div>

          {selectedRecipe && (
            <div className="flex flex-col gap-xs">
              <h3 className="text-label-lg text-on-surface">Live Stock Check</h3>
              <table className="w-full border-collapse text-left text-body-sm">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-sm py-xs text-label-sm uppercase text-on-surface-variant">Ingredient</th>
                    <th className="px-sm py-xs text-label-sm uppercase text-on-surface-variant">Required</th>
                    <th className="px-sm py-xs text-label-sm uppercase text-on-surface-variant">In Stock</th>
                    <th className="px-sm py-xs text-label-sm uppercase text-on-surface-variant">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipe.ingredients.map((ingredient) => {
                    const required = requiredQuantity(ingredient, plannedQuantity);
                    const inStock = stockFor(ingredient.materialId);
                    const short = inStock < required;
                    return (
                      <tr key={ingredient.id} className="border-t border-outline-variant">
                        <td className="px-sm py-xs">{ingredient.material.name}</td>
                        <td className="px-sm py-xs">
                          {required.toFixed(3)} {ingredient.uom.code}
                        </td>
                        <td className="px-sm py-xs">{inStock.toFixed(3)}</td>
                        <td className="px-sm py-xs">
                          <StatusBadge label={short ? "Short" : "OK"} tone={short ? "error" : "success"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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

      {completingOrder && (
        <form
          onSubmit={completionForm.handleSubmit(onCompleteSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">Complete {completingOrder.orderNo}</h2>
            <button type="button" onClick={closeCompleteForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-md">
            {completingOrder.recipe.ingredients.map((ingredient) => {
              const rowIndices = fields
                .map((field, index) => ({ field, index }))
                .filter(({ field }) => field.materialId === ingredient.materialId);
              const batches = availableBatchesByMaterial[ingredient.materialId] ?? [];

              return (
                <div key={ingredient.id} className="flex flex-col gap-sm rounded-md border border-outline-variant p-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-label-lg text-on-surface">{ingredient.material.name}</h3>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => append({ materialId: ingredient.materialId, batchId: "", quantity: 0, uomId: ingredient.uom.id })}
                    >
                      <Plus size={14} />
                      Add Batch
                    </Button>
                  </div>

                  {rowIndices.map(({ index }) => (
                    <div key={fields[index].id} className="grid grid-cols-1 gap-sm sm:grid-cols-[2fr_1fr_auto]">
                      <input type="hidden" {...completionForm.register(`inputs.${index}.materialId` as const)} />
                      <input type="hidden" {...completionForm.register(`inputs.${index}.uomId` as const)} />
                      <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                        Batch
                        <Select
                          {...completionForm.register(`inputs.${index}.batchId` as const)}
                          onChange={(e) => {
                            completionForm.setValue(`inputs.${index}.batchId`, e.target.value);
                            const batch = batches.find((candidate) => candidate.id === e.target.value);
                            if (batch) completionForm.setValue(`inputs.${index}.uomId`, batch.uom.id);
                          }}
                        >
                          <option value="">Select batch…</option>
                          {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {batch.batchNo} ({batch.remainingQuantity} {batch.uom.code} available)
                            </option>
                          ))}
                        </Select>
                      </label>

                      <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                        Quantity Consumed
                        <Input type="number" min={0} step="0.001" {...completionForm.register(`inputs.${index}.quantity` as const)} />
                      </label>

                      <button
                        type="button"
                        aria-label="Remove batch"
                        onClick={() => remove(index)}
                        disabled={rowIndices.length === 1}
                        className="self-end rounded-md p-xs text-error hover:bg-error-container disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}

            {completionForm.formState.errors.inputs?.message && (
              <p className="text-body-sm text-error">{completionForm.formState.errors.inputs.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-sm rounded-md border border-outline-variant p-sm">
            <h3 className="text-label-lg text-on-surface">Output — {completingOrder.recipe.outputMaterial.name}</h3>
            <input type="hidden" {...completionForm.register("output.uomId")} />
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-3">
              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Quantity
                <Input type="number" min={0} step="0.001" {...completionForm.register("output.quantity")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Warehouse *
                <Select {...completionForm.register("output.warehouseId")} error={!!completionForm.formState.errors.output?.warehouseId}>
                  <option value="">Select warehouse…</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Unit Cost
                <Input type="number" min={0} step="0.0001" {...completionForm.register("output.unitCost")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Manufacture Date
                <Input type="date" {...completionForm.register("output.manufactureDate")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                Expiry Date
                <Input type="date" {...completionForm.register("output.expiryDate")} />
              </label>

              <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                QC Result
                <Select {...completionForm.register("output.qcResult")}>
                  <option value="">Pending</option>
                  {qcResultValues.map((value) => (
                    <option key={value} value={value}>
                      {qcResultLabels[value]}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>

          {completionError && <p className="text-body-sm text-error">{completionError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={closeCompleteForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={completionForm.formState.isSubmitting}>
              {completionForm.formState.isSubmitting ? "Completing…" : "Complete Order"}
            </Button>
          </div>
        </form>
      )}

      <DataTable columns={columns} rows={orders} getRowKey={(order) => order.id} emptyMessage="No blend orders yet." />
    </div>
  );
}
