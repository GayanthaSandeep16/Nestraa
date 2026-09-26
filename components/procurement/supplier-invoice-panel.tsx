"use client";

import { useEffect, useState } from "react";
import { Plus, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { errorMessage } from "@/lib/http";

interface Supplier {
  id: string;
  name: string;
}

interface Grn {
  id: string;
  grnNo: string;
  supplierId: string;
}

interface SupplierInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  invoiceDate: string;
  totalAmount: string;
  supplier: { id: string; name: string };
  grn: { id: string; grnNo: string } | null;
  payments: { id: string; amount: string }[];
}

const statusTones: Record<string, StatusTone> = {
  paid: "success",
  partially_paid: "info",
  unpaid: "warning",
};

function paidTotal(invoice: SupplierInvoice) {
  return invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

function balance(invoice: SupplierInvoice) {
  return Number(invoice.totalAmount) - paidTotal(invoice);
}

const emptyDraft = {
  supplierId: "",
  grnId: "",
  invoiceDate: "",
  totalAmount: "",
};

export function SupplierInvoicePanel() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [grns, setGrns] = useState<Grn[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  function loadInvoices() {
    return fetch("/api/supplier-invoices")
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadInvoices();
    fetch("/api/suppliers").then((res) => res.json()).then(setSuppliers);
    fetch("/api/grns")
      .then((res) => res.json())
      .then((data: { id: string; grnNo: string; supplier: { id: string } }[]) =>
        setGrns(data.map((g) => ({ id: g.id, grnNo: g.grnNo, supplierId: g.supplier.id })))
      );
  }, []);

  function openForm() {
    setFormError(null);
    setDraft(emptyDraft);
    setFormOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/supplier-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: draft.supplierId,
        grnId: draft.grnId,
        totalAmount: draft.totalAmount,
        ...(draft.invoiceDate ? { invoiceDate: draft.invoiceDate } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(await errorMessage(res, "Could not save the invoice. Check the fields and try again."));
      return;
    }
    setFormOpen(false);
    await loadInvoices();
  }

  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, balance(invoice)), 0);
  const grnOptions = draft.supplierId ? grns.filter((g) => g.supplierId === draft.supplierId) : grns;

  const columns: DataTableColumn<SupplierInvoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      render: (invoice) => <span className="font-mono text-body-sm">{invoice.invoiceNo}</span>,
    },
    { key: "supplier", header: "Supplier", render: (invoice) => invoice.supplier.name },
    { key: "grn", header: "GRN", render: (invoice) => invoice.grn?.grnNo ?? "—" },
    {
      key: "date",
      header: "Date",
      render: (invoice) => new Date(invoice.invoiceDate).toLocaleDateString(),
    },
    { key: "total", header: "Total", render: (invoice) => Number(invoice.totalAmount).toFixed(2) },
    { key: "paid", header: "Paid", render: (invoice) => paidTotal(invoice).toFixed(2) },
    { key: "balance", header: "Balance", render: (invoice) => balance(invoice).toFixed(2) },
    {
      key: "status",
      header: "Status",
      render: (invoice) => (
        <StatusBadge label={invoice.status.replace(/_/g, " ")} tone={statusTones[invoice.status] ?? "neutral"} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (invoice) => (
        <button
          type="button"
          aria-label={`Print statement for ${invoice.supplier.name}`}
          title="Print supplier statement"
          onClick={() => window.open(`/api/suppliers/${invoice.supplier.id}/statement/pdf`, "_blank")}
          className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
        >
          <Printer size={16} />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading invoices…" : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-md">
          <p className="text-body-md text-on-surface">
            Outstanding: <span className="font-medium">{outstanding.toFixed(2)}</span>
          </p>
          <Button type="button" onClick={openForm} disabled={suppliers.length === 0}>
            <Plus size={16} />
            New Supplier Invoice
          </Button>
        </div>
      </div>

      {formOpen && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Supplier Invoice</h2>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="text-on-surface-variant">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Supplier *
              <Select
                value={draft.supplierId}
                onChange={(e) => setDraft((d) => ({ ...d, supplierId: e.target.value, grnId: "" }))}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Against GRN
              <Select value={draft.grnId} onChange={(e) => setDraft((d) => ({ ...d, grnId: e.target.value }))}>
                <option value="">— none —</option>
                {grnOptions.map((grn) => (
                  <option key={grn.id} value={grn.id}>
                    {grn.grnNo}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Invoice Date
              <Input
                type="date"
                value={draft.invoiceDate}
                onChange={(e) => setDraft((d) => ({ ...d, invoiceDate: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Total Amount *
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.totalAmount}
                onChange={(e) => setDraft((d) => ({ ...d, totalAmount: e.target.value }))}
              />
            </label>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(invoice) => invoice.id}
        emptyMessage="No supplier invoices yet."
      />
    </div>
  );
}
