"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { returnQualityStatusValues } from "@/lib/validation/consignment-returns";

interface InvoiceLine {
  id: string;
  materialId: string;
  quantity: string;
  unitPrice: string;
  material: { sku: string; name: string };
}

interface Invoice {
  id: string;
  invoiceNo: string;
  customer: { name: string };
  items: InvoiceLine[];
}

interface SalesReturn {
  id: string;
  returnNo: string;
  reason: string | null;
  createdAt: string;
  invoice: { invoiceNo: string } | null;
  customer: { name: string };
  items: { id: string }[];
}

const qualityLabels: Record<(typeof returnQualityStatusValues)[number], string> = {
  good: "Good",
  damaged: "Damaged",
  expired: "Expired",
};

type LineDraft = { quantity: string; unitPrice: string; qualityStatus: (typeof returnQualityStatusValues)[number] };

export function ReturnsPanel() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Record<string, LineDraft>>({});

  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId) ?? null;

  function loadReturns() {
    return fetch(`/api/sales-returns?page=${page}&pageSize=50`)
      .then((res) => res.json())
      .then((data) => {
        setReturns(data.rows);
        setPageCount(data.pageCount);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetch("/api/sales-invoices").then((res) => res.json()).then(setInvoices);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadReturns();
  }, [page]);

  function openForm() {
    setFormError(null);
    setInvoiceId("");
    setReason("");
    setLines({});
    setFormOpen(true);
  }

  function onSelectInvoice(id: string) {
    setInvoiceId(id);
    const invoice = invoices.find((candidate) => candidate.id === id);
    setLines(
      Object.fromEntries(
        (invoice?.items ?? []).map((line) => [
          line.id,
          { quantity: "", unitPrice: line.unitPrice, qualityStatus: "good" as const },
        ])
      )
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoice) return;
    const items = selectedInvoice.items
      .map((line) => ({ line, draft: lines[line.id] }))
      .filter(({ draft }) => draft && Number(draft.quantity) > 0)
      .map(({ line, draft }) => ({
        materialId: line.materialId,
        quantity: draft.quantity,
        unitPrice: draft.unitPrice,
        qualityStatus: draft.qualityStatus,
      }));

    if (items.length === 0) {
      setFormError("Enter a quantity for at least one line.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/sales-returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, reason, items }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setFormError(typeof body?.error === "string" ? body.error : "Could not record the return.");
      return;
    }
    setFormOpen(false);
    await loadReturns();
  }

  const columns: DataTableColumn<SalesReturn>[] = [
    {
      key: "returnNo",
      header: "Return #",
      render: (row) => <span className="font-mono text-body-sm">{row.returnNo}</span>,
    },
    { key: "invoice", header: "Invoice #", render: (row) => row.invoice?.invoiceNo ?? "—" },
    { key: "customer", header: "Customer", render: (row) => row.customer.name },
    { key: "lines", header: "Lines", render: (row) => row.items.length },
    { key: "reason", header: "Reason", render: (row) => row.reason || "—" },
    {
      key: "created",
      header: "Created",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading returns…" : `${returns.length} return${returns.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" onClick={openForm} disabled={invoices.length === 0}>
          New Return
        </Button>
      </div>

      {formOpen && (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">New Sales Return</h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Close form"
              className="text-on-surface-variant"
            >
              <X size={18} />
            </button>
          </div>

          <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
            Invoice *
            <Select value={invoiceId} onChange={(e) => onSelectInvoice(e.target.value)}>
              <option value="">Select invoice…</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNo} — {invoice.customer.name}
                </option>
              ))}
            </Select>
          </label>

          {selectedInvoice && (
            <div className="flex flex-col gap-sm">
              <h3 className="text-label-lg text-on-surface">Lines</h3>
              {selectedInvoice.items.map((line) => {
                const draft = lines[line.id];
                if (!draft) return null;
                return (
                  <div
                    key={line.id}
                    className="grid grid-cols-1 gap-sm rounded-md border border-outline-variant p-sm sm:grid-cols-[2fr_1fr_1fr_1.5fr]"
                  >
                    <div className="flex flex-col text-body-sm">
                      <span className="text-on-surface">
                        {line.material.sku} — {line.material.name}
                      </span>
                      <span className="text-on-surface-variant">invoiced {Number(line.quantity)}</span>
                    </div>

                    <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                      Return Qty
                      <Input
                        type="number"
                        min={0}
                        step="0.001"
                        value={draft.quantity}
                        onChange={(e) =>
                          setLines((prev) => ({ ...prev, [line.id]: { ...prev[line.id], quantity: e.target.value } }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                      Unit Price
                      <Input
                        type="number"
                        min={0}
                        step="0.0001"
                        value={draft.unitPrice}
                        onChange={(e) =>
                          setLines((prev) => ({ ...prev, [line.id]: { ...prev[line.id], unitPrice: e.target.value } }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
                      Condition
                      <Select
                        value={draft.qualityStatus}
                        onChange={(e) =>
                          setLines((prev) => ({
                            ...prev,
                            [line.id]: {
                              ...prev[line.id],
                              qualityStatus: e.target.value as (typeof returnQualityStatusValues)[number],
                            },
                          }))
                        }
                      >
                        {returnQualityStatusValues.map((value) => (
                          <option key={value} value={value}>
                            {qualityLabels[value]}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
            Reason
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !selectedInvoice}>
              {saving ? "Saving…" : "Record Return"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={returns}
        getRowKey={(row) => row.id}
        emptyMessage="No sales returns yet."
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}
