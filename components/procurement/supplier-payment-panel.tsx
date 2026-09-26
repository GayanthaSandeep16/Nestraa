"use client";

import { useEffect, useState } from "react";
import { Banknote, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { paymentMethodValues } from "@/lib/validation/payments";
import { errorMessage } from "@/lib/http";

interface SupplierInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  invoiceDate: string;
  totalAmount: string;
  supplier: { id: string; name: string };
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

function paidTotal(invoice: SupplierInvoice) {
  return invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
}

function balance(invoice: SupplierInvoice) {
  return Number(invoice.totalAmount) - paidTotal(invoice);
}

export function SupplierPaymentPanel() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor] = useState<SupplierInvoice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    amount: "",
    paymentMethod: "cash" as (typeof paymentMethodValues)[number],
    referenceNumber: "",
    notes: "",
  });

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
  }, []);

  function openPayment(invoice: SupplierInvoice) {
    setFormError(null);
    setDraft({
      amount: String(balance(invoice) > 0 ? balance(invoice).toFixed(2) : ""),
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
    });
    setPayFor(invoice);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/supplier-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: payFor.supplier.id,
        supplierInvoiceId: payFor.id,
        amount: draft.amount,
        paymentMethod: draft.paymentMethod,
        referenceNumber: draft.referenceNumber,
        notes: draft.notes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setFormError(await errorMessage(res, "Could not record the payment. Check the amount and try again."));
      return;
    }
    const payment = await res.json();
    if (payment?.id) window.open(`/api/supplier-payments/${payment.id}/pdf`, "_blank");
    setPayFor(null);
    await loadInvoices();
  }

  const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, balance(invoice)), 0);

  const columns: DataTableColumn<SupplierInvoice>[] = [
    {
      key: "invoiceNo",
      header: "Invoice #",
      render: (invoice) => <span className="font-mono text-body-sm">{invoice.invoiceNo}</span>,
    },
    { key: "supplier", header: "Supplier", render: (invoice) => invoice.supplier.name },
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
              aria-label={`Print latest voucher for ${invoice.invoiceNo}`}
              title="Print latest voucher"
              onClick={() =>
                window.open(
                  `/api/supplier-payments/${invoice.payments[invoice.payments.length - 1].id}/pdf`,
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
              aria-label={`Record payment for ${invoice.invoiceNo}`}
              title="Record payment"
              onClick={() => openPayment(invoice)}
              className="rounded-md p-xs text-primary hover:bg-primary-container/30"
            >
              <Banknote size={16} />
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

      {payFor && (
        <form
          onSubmit={submitPayment}
          className="flex flex-col gap-md rounded-md border border-outline-variant bg-surface-container-lowest p-lg"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-headline-md text-on-surface">
              Record payment — {payFor.invoiceNo}{" "}
              <span className="text-body-md text-on-surface-variant">(balance {balance(payFor).toFixed(2)})</span>
            </h2>
            <button
              type="button"
              onClick={() => setPayFor(null)}
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
            <Button type="button" variant="secondary" onClick={() => setPayFor(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        rows={invoices}
        getRowKey={(invoice) => invoice.id}
        emptyMessage="No supplier invoices to pay yet."
      />
    </div>
  );
}
