"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { retailerSchema, type RetailerFormValues } from "@/lib/validation/retailers";
import { fetchJson, errorMessage } from "@/lib/http";

interface Retailer {
  id: string;
  customerId: string;
  retailerCode: string;
  route: string | null;
  assignedSalesRepId: string | null;
  customer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    creditLimit: string;
    isActive: boolean;
  };
  assignedSalesRep: { fullName: string } | null;
}

interface SalesRep {
  id: string;
  fullName: string;
}

const emptyValues: RetailerFormValues = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  creditLimit: 0,
  paymentTerms: "",
  retailerCode: "",
  route: "",
};

export function RetailerPanel() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RetailerFormValues>({
    resolver: zodResolver(retailerSchema),
    defaultValues: emptyValues,
  });

  function loadRetailers() {
    return fetchJson<Retailer[]>("/api/retailers").then((data) => {
      setRetailers(data ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadRetailers();
    fetchJson<{ salesReps: SalesRep[] }>("/api/lookups").then((data) => setSalesReps(data?.salesReps ?? []));
  }, []);

  const filteredRetailers = retailers.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.customer.name.toLowerCase().includes(q) ||
      r.retailerCode.toLowerCase().includes(q) ||
      (r.customer.phone ?? "").includes(q)
    );
  });

  function openCreateForm() {
    setEditingId(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(retailer: Retailer) {
    setEditingId(retailer.id);
    setFormError(null);
    reset({
      name: retailer.customer.name,
      phone: retailer.customer.phone ?? "",
      email: retailer.customer.email ?? "",
      address: retailer.customer.address ?? "",
      creditLimit: Number(retailer.customer.creditLimit ?? 0),
      retailerCode: retailer.retailerCode,
      route: retailer.route ?? "",
      assignedSalesRepId: retailer.assignedSalesRepId ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function onSubmit(values: RetailerFormValues) {
    setFormError(null);
    const url = editingId ? `/api/retailers/${editingId}` : "/api/retailers";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError(await errorMessage(res, "Could not save retailer. Check the fields and try again."));
      return;
    }

    closeForm();
    await loadRetailers();
  }

  async function handleDelete(retailer: Retailer) {
    if (!confirm(`Remove ${retailer.customer.name}? It will no longer appear in the list.`)) return;
    await fetch(`/api/retailers/${retailer.id}`, { method: "DELETE" });
    await loadRetailers();
  }

  const columns: DataTableColumn<Retailer>[] = [
    { key: "code", header: "Code", render: (r) => <span className="font-medium">{r.retailerCode}</span> },
    { key: "name", header: "Name", render: (r) => r.customer.name },
    { key: "route", header: "Route", render: (r) => r.route || "—" },
    { key: "salesRep", header: "Sales Rep", render: (r) => r.assignedSalesRep?.fullName || "—" },
    {
      key: "reach",
      header: "Phone / Email",
      render: (r) => (
        <div className="flex flex-col text-body-sm">
          <span>{r.customer.phone || "—"}</span>
          <span className="text-on-surface-variant">{r.customer.email || ""}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge label={r.customer.isActive ? "Active" : "Inactive"} tone={r.customer.isActive ? "success" : "neutral"} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${r.customer.name}`}
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
            aria-label={`Delete ${r.customer.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(r);
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
      <div className="flex items-center justify-between gap-md">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading retailers…" : `${filteredRetailers.length} retailer${filteredRetailers.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-sm">
          <div className="relative">
            <Search size={16} className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, phone…"
              className="pl-[2rem]"
            />
          </div>
          <Button type="button" onClick={openCreateForm}>
            <Plus size={16} />
            New Retailer
          </Button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Retailer" : "New Retailer"}</h2>
            <button type="button" onClick={closeForm} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Shop Name *
              <Input {...register("name")} error={!!errors.name} />
              {errors.name && <span className="text-body-sm text-error">{errors.name.message}</span>}
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Retailer Code
              <Input {...register("retailerCode")} placeholder="Auto-generated if left blank" />
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
              Route / Territory
              <Input {...register("route")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Credit Limit
              <Input type="number" min={0} step="0.01" {...register("creditLimit")} />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Assigned Sales Rep
              <Select {...register("assignedSalesRepId")}>
                <option value="">Unassigned</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName}
                  </option>
                ))}
              </Select>
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
        rows={filteredRetailers}
        getRowKey={(r) => r.id}
        onRowClick={openEditForm}
        emptyMessage="No retailers yet. Add your first retail shop to get started."
      />
    </div>
  );
}
