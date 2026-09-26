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
import { customerSchema, customerTypeValues, type CustomerFormValues } from "@/lib/validation/customers";

interface Customer extends CustomerFormValues {
  id: string;
  isActive: boolean;
}

const customerTypeLabels: Record<(typeof customerTypeValues)[number], string> = {
  hotel: "Hotel",
  retail: "Retail",
  wholesale: "Wholesale",
  individual: "Individual",
};

const emptyValues: CustomerFormValues = {
  name: "",
  customerType: "retail",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  creditLimit: 0,
  paymentTerms: "",
};

export function CustomerPanel() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: emptyValues,
  });

  function loadCustomers() {
    return fetch(`/api/customers?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadCustomers();
  }, [page]);

  function openCreateForm() {
    setEditingId(null);
    setFormError(null);
    reset(emptyValues);
    setFormOpen(true);
  }

  function openEditForm(customer: Customer) {
    setEditingId(customer.id);
    setFormError(null);
    reset({
      name: customer.name,
      customerType: customer.customerType,
      contactPerson: customer.contactPerson ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      creditLimit: Number(customer.creditLimit ?? 0),
      paymentTerms: customer.paymentTerms ?? "",
    });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormError(null);
  }

  async function onSubmit(values: CustomerFormValues) {
    setFormError(null);
    const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      setFormError("Could not save customer. Check the fields and try again.");
      return;
    }

    closeForm();
    await loadCustomers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this customer? It will no longer appear in the list.")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    await loadCustomers();
  }

  const columns: DataTableColumn<Customer>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "type", header: "Type", render: (c) => customerTypeLabels[c.customerType] },
    { key: "contact", header: "Contact", render: (c) => c.contactPerson || "—" },
    {
      key: "reach",
      header: "Phone / Email",
      render: (c) => (
        <div className="flex flex-col text-body-sm">
          <span>{c.phone || "—"}</span>
          <span className="text-on-surface-variant">{c.email || ""}</span>
        </div>
      ),
    },
    { key: "creditLimit", header: "Credit Limit", render: (c) => Number(c.creditLimit ?? 0).toFixed(2) },
    {
      key: "status",
      header: "Status",
      render: (c) => <StatusBadge label={c.isActive ? "Active" : "Inactive"} tone={c.isActive ? "success" : "neutral"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-xs">
          <button
            type="button"
            aria-label={`Edit ${c.name}`}
            onClick={(e) => {
              e.stopPropagation();
              openEditForm(c);
            }}
            className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${c.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(c.id);
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
          {loading ? "Loading customers…" : `${customers.length} customer${customers.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openCreateForm}>
          <Plus size={16} />
          New Customer
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">{editingId ? "Edit Customer" : "New Customer"}</h2>
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
              Customer Type *
              <Select {...register("customerType")} error={!!errors.customerType}>
                {customerTypeValues.map((value) => (
                  <option key={value} value={value}>
                    {customerTypeLabels[value]}
                  </option>
                ))}
              </Select>
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
              Credit Limit
              <Input type="number" min={0} step="0.01" {...register("creditLimit")} />
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
        rows={customers}
        getRowKey={(c) => c.id}
        onRowClick={openEditForm}
        emptyMessage="No customers yet. Add your first customer to get started."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
