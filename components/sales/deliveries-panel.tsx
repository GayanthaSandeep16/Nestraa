"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { errorMessage } from "@/lib/http";

interface Invoice {
  id: string;
  invoiceNo: string;
  customer: { name: string };
}

interface DeliveryNote {
  id: string;
  deliveryNo: string;
  deliveredAt: string | null;
  notes: string | null;
  invoice: { invoiceNo: string; customer: { name: string } } | null;
}

export function DeliveriesPanel() {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ invoiceId: "", notes: "" });
  const [saving, setSaving] = useState(false);

  function loadNotes() {
    return fetch(`/api/delivery-notes?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/sales-invoices").then((res) => res.json()).then(setInvoices);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadNotes();
  }, [page]);

  function openForm() {
    setFormError(null);
    setDraft({ invoiceId: "", notes: "" });
    setFormOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/delivery-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(await errorMessage(res, "Could not create the delivery note. Pick an invoice and try again."));
      return;
    }
    setFormOpen(false);
    await loadNotes();
  }

  const columns: DataTableColumn<DeliveryNote>[] = [
    {
      key: "deliveryNo",
      header: "Delivery #",
      render: (note) => <span className="font-mono text-body-sm">{note.deliveryNo}</span>,
    },
    { key: "invoice", header: "Invoice #", render: (note) => note.invoice?.invoiceNo ?? "—" },
    { key: "customer", header: "Customer", render: (note) => note.invoice?.customer.name ?? "—" },
    {
      key: "deliveredAt",
      header: "Delivered At",
      render: (note) => (note.deliveredAt ? new Date(note.deliveredAt).toLocaleString() : "—"),
    },
    { key: "notes", header: "Notes", render: (note) => note.notes || "—" },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading delivery notes…" : `${notes.length} delivery note${notes.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openForm} disabled={invoices.length === 0}>
          <Plus size={16} />
          New from Invoice
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Delivery Note</h2>
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
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Invoice *
              <Select
                value={draft.invoiceId}
                onChange={(e) => setDraft((d) => ({ ...d, invoiceId: e.target.value }))}
              >
                <option value="">Select invoice…</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNo} — {invoice.customer.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Notes
              <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </label>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !draft.invoiceId}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={notes}
        getRowKey={(note) => note.id}
        emptyMessage="No delivery notes yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
