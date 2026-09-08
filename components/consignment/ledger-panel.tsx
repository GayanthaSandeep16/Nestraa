"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { fetchJson } from "@/lib/http";

interface Retailer {
  id: string;
  retailerCode: string;
  customerId: string;
  customer: { name: string };
}

interface LedgerEntry {
  id: string;
  transactionDate: string;
  transactionType: "delivery" | "payment" | "return";
  description: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
}

const typeLabels: Record<LedgerEntry["transactionType"], string> = {
  delivery: "Delivery",
  payment: "Payment",
  return: "Return",
};

export function LedgerPanel() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState("");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState<string>("0");
  const [loadedRetailerId, setLoadedRetailerId] = useState<string | null>(null);
  const loading = selectedRetailerId !== "" && selectedRetailerId !== loadedRetailerId;

  useEffect(() => {
    fetchJson<Retailer[]>("/api/retailers").then((data) => setRetailers(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedRetailerId) return;

    fetchJson<{ entries: LedgerEntry[]; outstandingBalance: string }>(`/api/retailers/${selectedRetailerId}/ledger`).then((data) => {
      setEntries(data?.entries ?? []);
      setOutstandingBalance(data?.outstandingBalance ?? "0");
      setLoadedRetailerId(selectedRetailerId);
    });
  }, [selectedRetailerId]);

  const columns: DataTableColumn<LedgerEntry>[] = [
    { key: "date", header: "Date", render: (e) => new Date(e.transactionDate).toLocaleDateString() },
    { key: "type", header: "Type", render: (e) => typeLabels[e.transactionType] },
    { key: "description", header: "Description", render: (e) => e.description ?? "—" },
    { key: "debit", header: "Debit", render: (e) => (Number(e.debit) > 0 ? Number(e.debit).toFixed(2) : "—") },
    { key: "credit", header: "Credit", render: (e) => (Number(e.credit) > 0 ? Number(e.credit).toFixed(2) : "—") },
    { key: "balance", header: "Balance", render: (e) => Number(e.runningBalance).toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <label className="flex flex-1 flex-col gap-xs text-label-md text-on-surface-variant sm:max-w-xs">
          Retailer
          <Select value={selectedRetailerId} onChange={(e) => setSelectedRetailerId(e.target.value)}>
            <option value="">Select retailer…</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.retailerCode} — {r.customer.name}
              </option>
            ))}
          </Select>
        </label>

        {selectedRetailerId && (
          <div className="flex items-center gap-md">
            <div className="text-right">
              <p className="text-label-sm text-on-surface-variant">Outstanding Balance</p>
              <p className="text-headline-md text-on-surface">{Number(outstandingBalance).toFixed(2)}</p>
            </div>
            <a href={`/api/retailers/${selectedRetailerId}/statement/pdf`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary">
                <FileText size={16} />
                Statement
              </Button>
            </a>
          </div>
        )}
      </div>

      {selectedRetailerId ? (
        <DataTable
          columns={columns}
          rows={entries}
          getRowKey={(e) => e.id}
          emptyMessage={loading ? "Loading ledger…" : "No transactions yet for this retailer."}
        />
      ) : (
        <p className="text-body-md text-on-surface-variant">Select a retailer to view their ledger.</p>
      )}
    </div>
  );
}
