"use client";

import { useEffect, useState } from "react";
import { Receipt, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { paymentMethodValues } from "@/lib/validation/payments";

interface Invoice {
  id: string;
  invoiceNo: string;
  status: string;
  invoiceDate: string;
  totalAmount: string;
  customer: { id: string; name: string };
  payments: { id: string; amount: string }[];
}

const statusTones: Record<string, StatusTone> = {
  paid: "success",
  partially_paid: "info",
  unpaid: "warning",
};

const methodLabels: Record<(typeof paymentMethodValues)[number], string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

function paidTotal(invoice: Invoice) {
  return invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

function balance(invoice: Invoice) {
  return Number(invoice.totalAmount) - paidTotal(invoice);
}

export function ReceiptsPanel() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptFor, setReceiptFor] = useState<Invoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    amount: "",
    paymentMethod: "cash" as (typeof paymentMethodValues)[number],
    paymentDate: new Date().toLocaleDateString("en-CA"),
    referenceNumber: "",
    notes: "",
  });

  function loadInvoices() {
    return fetch("/api/sales-invoices")
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadInvoices();
  }, []);

  function openReceipt(invoice: Invoice) {
    setFormError(null);
    setDraft({
      amount: String(balance(invoice) > 0 ? balance(invoice).toFixed(2) : ""),
      paymentMethod: "cash",
      paymentDate: new Date().toLocaleDateString("en-CA"),
      referenceNumber: "",
      notes: "",
    });
    setReceiptFor(invoice);
  }

  async function submitReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptFor) return;
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: receiptFor.customer.id,
        invoiceId: receiptFor.id,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod,
        referenceNumber: draft.referenceNumber,
        notes: draft.notes,
        ...(draft.paymentDate ? { paymentDate: draft.paymentDate } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError("Could not record the receipt. Check the amount and try again.");
      return;
    }
    const payment = await res.json();
    if (payment?.id) window.open(`/api/payments/${payment.id}/pdf`, "_blank");
    setReceiptFor(null);
    await loadInvoices();
  }

  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, balance(invoice)), 0);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      render: (invoice) => <span className="font-mono text-body-sm">{invoice.invoiceNo}</span>,
    },
    { key: "customer", header: "Customer", render: (invoice) => invoice.customer.name },
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
        <div className="flex justify-end gap-xs">
          {invoice.payments.length > 0 && (
            <button
              type="button"
              aria-label={`Print latest receipt for ${invoice.invoiceNo}`}
              title="Print latest receipt"
              onClick={() =>
                window.open(
                  `/api/payments/${invoice.payments[invoice.payments.length - 1].id}/pdf`,
                  "_blank"
                )
              }
              className="rounded-md p-xs text-on-surface-variant hover:bg-surface-container-low"
            >
              <Printer size={16} />
            </button>
          )}
          {invoice.status !== "paid" && (
            <button
              type="button"
              aria-label={`Record receipt for ${invoice.invoiceNo}`}
              title="Record receipt"
              onClick={() => openReceipt(invoice)}
              className="rounded-md p-xs text-primary hover:bg-primary-container/30"
            >
              <Receipt size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between">
        <p className="text-body-md text-on-surface-variant">
          {loading ? "Loading invoices…" : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`}
        </p>
        <p className="text-body-md text-on-surface">
          Outstanding: <span className="font-medium">{outstanding.toFixed(2)}</span>
        </p>
      </div>

      {receiptFor && (
        <form
          onSubmit={submitReceipt}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">
              Record receipt — {receiptFor.invoiceNo}{" "}
              <span className="text-body-md text-on-surface-variant">
                (balance {balance(receiptFor).toFixed(2)})
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setReceiptFor(null)}
              aria-label="Close form"
              className="text-on-surface-variant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Amount *
              <Input
                type="number"
                min={0}
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Method *
              <Select
                value={draft.paymentMethod}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, paymentMethod: e.target.value as (typeof paymentMethodValues)[number] }))
                }
              >
                {paymentMethodValues.map((value) => (
                  <option key={value} value={value}>
                    {methodLabels[value]}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Date
              <Input
                type="date"
                value={draft.paymentDate}
                onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant">
              Reference #
              <Input
                value={draft.referenceNumber}
                onChange={(e) => setDraft((d) => ({ ...d, referenceNumber: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-xs text-label-md text-on-surface-variant sm:col-span-2">
              Notes
              <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </label>
          </div>

          {formError && <p className="text-body-sm text-error">{formError}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={() => setReceiptFor(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record receipt"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(invoice) => invoice.id}
        emptyMessage="No invoices to collect on yet."
      />
    </div>
  );
}
