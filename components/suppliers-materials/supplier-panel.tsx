"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { supplierSchema, type SupplierFormValues } from "@/lib/validation/suppliers";

interface Supplier extends SupplierFormValues {
  id: string;
  isActive: boolean;
}

const emptyValues: SupplierFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  paymentTerms: "",
};

export function SupplierPanel() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: emptyValues,
  });

  function loadSuppliers() {
    return fetch("/api/suppliers")
      .then((res) => res.json())
      .then((data) => {
        setSuppliers(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(supplier: Supplier) {
    setEditingId(supplier.id);
    setFormError(null);
    reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson ?? "",
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      paymentTerms: supplier.paymentTerms ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function onSubmit(values: SupplierFormValues) {
    setFormError(null);
    const url = editingId ? `/api/suppliers/${editingId}` : "/api/suppliers";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save supplier. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this supplier? It will no longer appear in the list.")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    await loadSuppliers();
  }

  const columns: DataTableColumn<Supplier>[] = [
    { key: "name", header: "Name", render: (s) => <span className="font-medium">{s.name}</span> },
    { key: "contact", header: "Contact", render: (s) => s.contactPerson || "—" },
    {
      key: "reach",
      header: "Phone / Email",
      render: (s) => (
        <div className="flex flex-col text-body-sm">
          <span>{s.phone || "—"}</span>
          <span className="text-on-surface-variant">{s.email || ""}</span>
        </div>
      ),
    },
    { key: "terms", header: "Payment Terms", render: (s) => s.paymentTerms || "—" },
    {
      key: "status",
      header: "Status",
      render: (s) => <StatusBadge label={s.isActive ? "Active" : "Inactive"} tone={s.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (s) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${s.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(s);
            }}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${s.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(s.id);
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
          {loading ? "Loading suppliers…" : `${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm}>
          <Plus size={16} />
          New Supplier
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Supplier" : "New Supplier"}</h2>
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
              Contact Person
              <Input {...register("contactPerson")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Phone
              <Input {...register("phone")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Email
              <Input type="email" {...register("email")} error={!!errors.email} />
              {errors.email && <span className="text-body-sm text-error">{errors.email.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant sm:col-span-2">
              Address
              <Input {...register("address")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Payment Terms
              <Input {...register("paymentTerms")} placeholder="e.g. Net 30" />
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
        rows={suppliers}
        getRowKey={(s) => s.id}
        onRowClick={openEditForm}
        emptyMessage="No suppliers yet. Add your first supplier to get started."
      />
    </div>
  );
}
