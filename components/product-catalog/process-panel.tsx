"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { processDefinitionSchema, type ProcessDefinitionFormValues } from "@/lib/validation/process-definitions";

interface Material {
  id: string;
  sku: string;
  name: string;
}

interface ProcessDefinition {
  id: string;
  name: string;
  inputMaterialId: string | null;
  outputMaterialId: string | null;
  expectedYieldPct: string | null;
  description: string | null;
  inputMaterial: Material | null;
  outputMaterial: Material | null;
}

const emptyValues: ProcessDefinitionFormValues = {
  name: "",
  inputMaterialId: "",
  outputMaterialId: "",
  expectedYieldPct: "",
  description: "",
};

export function ProcessPanel() {
  const [processes, setProcesses] = useState<ProcessDefinition[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProcessDefinitionFormValues>({
    resolver: zodResolver(processDefinitionSchema),
    defaultValues: emptyValues,
  });

  function loadProcesses() {
    return fetch("/api/process-definitions")
      .then((res) => res.json())
      .then((data) => {
        setProcesses(data);
        setLoading(false);
      });
  }

  function loadMaterials() {
    return fetch("/api/materials")
      .then((res) => res.json())
      .then((data) => setMaterials(data));
  }

  useEffect(() => {
    loadProcesses();
    loadMaterials();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(process: ProcessDefinition) {
    setEditingId(process.id);
    setFormError(null);
    reset({
      name: process.name,
      inputMaterialId: process.inputMaterialId ?? "",
      outputMaterialId: process.outputMaterialId ?? "",
      expectedYieldPct: process.expectedYieldPct !== null ? Number(process.expectedYieldPct) : "",
      description: process.description ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function onSubmit(values: ProcessDefinitionFormValues) {
    setFormError(null);
    const url = editingId ? `/api/process-definitions/${editingId}` : "/api/process-definitions";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save process definition. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadProcesses();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this process definition? This cannot be undone.")) return;
    await fetch(`/api/process-definitions/${id}`, { method: "DELETE" });
    await loadProcesses();
  }

  const columns: DataTableColumn<ProcessDefinition>[] = [
    { key: "name", header: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "input", header: "Input Material", render: (p) => p.inputMaterial?.name ?? "—" },
    { key: "output", header: "Output Material", render: (p) => p.outputMaterial?.name ?? "—" },
    { key: "yield", header: "Expected Yield %", render: (p) => (p.expectedYieldPct !== null ? `${p.expectedYieldPct}%` : "—") },
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
          {loading ? "Loading process definitions…" : `${processes.length} process definition${processes.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm}>
          <Plus size={16} />
          New Process
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Process" : "New Process"}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Name *
              <Input {...register("name")} error={!!errors.name} />
              {errors.name && <span className="text-body-sm text-error">{errors.name.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Expected Yield %
              <Input type="number" min={0} max={100} step="0.001" {...register("expectedYieldPct")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Input Material
              <Select {...register("inputMaterialId")}>
                <option value="">None</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.sku})
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Output Material
              <Select {...register("outputMaterialId")}>
                <option value="">None</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.sku})
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant sm:col-span-2">
              Description
              <Input {...register("description")} />
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
        rows={processes}
        getRowKey={(p) => p.id}
        onRowClick={openEditForm}
        emptyMessage="No process definitions yet. Add routing for simple-process products to get started."
      />
    </div>
  );
}
