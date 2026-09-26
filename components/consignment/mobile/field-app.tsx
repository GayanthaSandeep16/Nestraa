"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, FileText, Banknote, PackageCheck, Undo2, Truck } from "lucide-react";
import { fetchJson, errorMessage } from "@/lib/http";
import { useDraftStorage } from "@/lib/hooks/use-draft-storage";
import { paymentMethodValues } from "@/lib/validation/payments";
import { returnQualityStatusValues } from "@/lib/validation/consignment-returns";

interface Retailer {
  id: string;
  retailerCode: string;
  customerId: string;
  route: string | null;
  assignedSalesRepId: string | null;
  outstandingBalance: string;
  customer: { name: string; phone: string | null; address: string | null };
}

type ConsignmentStatus = "draft" | "delivered" | "partially_settled" | "fully_settled" | "cancelled";

interface ConsignmentItem {
  id: string;
  materialId: string;
  quantityDelivered: string;
  quantitySold: string;
  quantityReturned: string;
  unitPrice: string;
  material: { name: string; sku: string };
}

interface Consignment {
  id: string;
  consignmentNumber: string;
  status: ConsignmentStatus;
  customer: { id: string; name: string };
  salesRepId: string | null;
  items: ConsignmentItem[];
}

const statusLabels: Record<ConsignmentStatus, string> = {
  draft: "Draft",
  delivered: "Delivered",
  partially_settled: "Partially Settled",
  fully_settled: "Fully Settled",
  cancelled: "Cancelled",
};

function remaining(item: ConsignmentItem) {
  return Number(item.quantityDelivered) - Number(item.quantitySold) - Number(item.quantityReturned);
}

type Screen = { name: "retailers" } | { name: "retailer"; retailerId: string } | { name: "consignment"; consignmentId: string };

export function FieldApp({ currentUserId, currentUserName }: { currentUserId: string; currentUserName: string }) {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [screen, setScreen] = useState<Screen>({ name: "retailers" });

  function reload() {
    return Promise.all([fetchJson<Retailer[]>("/api/retailers"), fetchJson<Consignment[]>("/api/consignments")]).then(([r, c]) => {
      setRetailers(r ?? []);
      setConsignments(c ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  const myRetailers = useMemo(() => retailers.filter((r) => r.assignedSalesRepId === currentUserId), [retailers, currentUserId]);
  const scopedRetailers = myRetailers.length > 0 ? myRetailers : retailers;
  const showingFallback = myRetailers.length === 0 && retailers.length > 0;

  const filteredRetailers = scopedRetailers.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.customer.name.toLowerCase().includes(q) ||
      r.retailerCode.toLowerCase().includes(q) ||
      (r.customer.phone ?? "").includes(q)
    );
  });

  if (loading) {
    return <p className="p-lg text-body-md text-on-surface-variant">Loading…</p>;
  }

  if (screen.name === "retailer") {
    const retailer = retailers.find((r) => r.id === screen.retailerId);
    if (!retailer) return null;
    const retailerConsignments = consignments.filter((c) => c.customer.id === retailer.customerId);
    return (
      <RetailerScreen
        retailer={retailer}
        consignments={retailerConsignments}
        onBack={() => setScreen({ name: "retailers" })}
        onOpenConsignment={(id) => setScreen({ name: "consignment", consignmentId: id })}
      />
    );
  }

  if (screen.name === "consignment") {
    const consignment = consignments.find((c) => c.id === screen.consignmentId);
    if (!consignment) return null;
    return (
      <ConsignmentScreen
        consignment={consignment}
        onBack={() => setScreen({ name: "retailer", retailerId: retailers.find((r) => r.customerId === consignment.customer.id)?.id ?? "" })}
        onChanged={reload}
      />
    );
  }

  return (
    <div className="flex flex-col gap-md p-md">
      <div>
        <h1 className="text-headline-md text-on-surface">Hi, {currentUserName.split(" ")[0]}</h1>
        <p className="text-body-sm text-on-surface-variant">
          {scopedRetailers.length} retailer{scopedRetailers.length === 1 ? "" : "s"}
          {showingFallback ? " (none assigned to you yet — showing all)" : ""}
        </p>
      </div>

      <div className="relative">
        <Search size={20} className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search retailer, code, or phone…"
          className="w-full rounded-full border border-outline-variant bg-surface-container-lowest py-md pl-[3rem] pr-md text-body-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/30"
        />
      </div>

      <div className="flex flex-col gap-sm">
        {filteredRetailers.length === 0 && <p className="text-body-md text-on-surface-variant">No retailers found.</p>}
        {filteredRetailers.map((retailer) => {
          const balance = Number(retailer.outstandingBalance);
          return (
            <button
              key={retailer.id}
              type="button"
              onClick={() => setScreen({ name: "retailer", retailerId: retailer.id })}
              className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-left active:bg-surface-container-low"
            >
              <div>
                <p className="text-body-lg font-medium text-on-surface">{retailer.customer.name}</p>
                <p className="text-body-sm text-on-surface-variant">
                  {retailer.retailerCode} {retailer.route ? `· ${retailer.route}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-label-sm text-on-surface-variant">Balance</p>
                <p className={balance > 0 ? "text-body-lg font-medium text-error" : "text-body-lg font-medium text-on-surface"}>
                  {balance.toFixed(2)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-sm border-b border-outline-variant p-md">
      <button type="button" onClick={onBack} aria-label="Back" className="rounded-full p-sm active:bg-surface-container-low">
        <ArrowLeft size={22} />
      </button>
      <h1 className="text-headline-md text-on-surface">{title}</h1>
    </div>
  );
}

function RetailerScreen({
  retailer,
  consignments,
  onBack,
  onOpenConsignment,
}: {
  retailer: Retailer;
  consignments: Consignment[];
  onBack: () => void;
  onOpenConsignment: (id: string) => void;
}) {
  const balance = Number(retailer.outstandingBalance);

  return (
    <div className="flex flex-col gap-md pb-lg">
      <BackHeader title={retailer.customer.name} onBack={onBack} />

      <div className="mx-md flex flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
        <p className="text-label-sm text-on-surface-variant">Outstanding Balance</p>
        <p className={balance > 0 ? "text-headline-lg text-error" : "text-headline-lg text-on-surface"}>{balance.toFixed(2)}</p>
        <p className="text-body-sm text-on-surface-variant">{retailer.customer.phone ?? "No phone on file"}</p>
        <p className="text-body-sm text-on-surface-variant">{retailer.customer.address ?? ""}</p>
      </div>

      <a href={`/api/retailers/${retailer.id}/statement/pdf`} target="_blank" rel="noopener noreferrer" className="mx-md">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest py-md text-body-lg font-medium active:bg-surface-container-low"
        >
          <FileText size={18} />
          View Statement
        </button>
      </a>

      <div className="flex flex-col gap-sm px-md">
        <h2 className="text-label-lg text-on-surface">Consignments</h2>
        {consignments.length === 0 && <p className="text-body-md text-on-surface-variant">No consignments yet.</p>}
        {consignments.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpenConsignment(c.id)}
            className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest p-md text-left active:bg-surface-container-low"
          >
            <div>
              <p className="font-mono text-body-md text-on-surface">{c.consignmentNumber}</p>
              <p className="text-body-sm text-on-surface-variant">{statusLabels[c.status]}</p>
            </div>
            {c.status === "draft" && <Truck size={20} className="text-on-surface-variant" />}
          </button>
        ))}
      </div>
    </div>
  );
}

type ActionForm = "sale" | "return" | "payment" | null;

function ConsignmentScreen({
  consignment,
  onBack,
  onChanged,
}: {
  consignment: Consignment;
  onBack: () => void;
  onChanged: () => Promise<void>;
}) {
  const [activeForm, setActiveForm] = useState<ActionForm>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deliver() {
    if (!confirm(`Deliver ${consignment.consignmentNumber}? Stock moves to the retailer and they are billed the full value.`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/deliver`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not deliver consignment.");
      return;
    }
    await onChanged();
  }

  return (
    <div className="flex flex-col gap-md pb-xl">
      <BackHeader title={consignment.consignmentNumber} onBack={onBack} />

      <div className="mx-md flex flex-col gap-sm">
        {consignment.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
            <p className="text-body-lg font-medium text-on-surface">{item.material.name}</p>
            <p className="text-body-sm text-on-surface-variant">
              Held: {remaining(item)} · Delivered: {item.quantityDelivered} · Sold: {item.quantitySold} · Returned:{" "}
              {item.quantityReturned}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="mx-md text-body-sm text-error">{error}</p>}

      <div className="flex flex-col gap-sm px-md">
        {consignment.status === "draft" ? (
          <ActionButton icon={<Truck size={20} />} label={busy ? "Delivering…" : "Deliver"} onClick={deliver} disabled={busy} />
        ) : (
          <>
            <a href={`/api/consignments/${consignment.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <ActionButton icon={<FileText size={20} />} label="Delivery Note / Invoice" onClick={() => {}} variant="secondary" />
            </a>
            <ActionButton
              icon={<PackageCheck size={20} />}
              label="Record Sale"
              onClick={() => setActiveForm(activeForm === "sale" ? null : "sale")}
            />
            <ActionButton
              icon={<Undo2 size={20} />}
              label="Record Return"
              onClick={() => setActiveForm(activeForm === "return" ? null : "return")}
            />
            <ActionButton
              icon={<Banknote size={20} />}
              label="Record Payment"
              onClick={() => setActiveForm(activeForm === "payment" ? null : "payment")}
            />
          </>
        )}
      </div>

      {activeForm === "sale" && (
        <RecordSaleForm
          consignment={consignment}
          onDone={async () => {
            setActiveForm(null);
            await onChanged();
          }}
        />
      )}
      {activeForm === "return" && (
        <RecordReturnForm
          consignment={consignment}
          onDone={async () => {
            setActiveForm(null);
            await onChanged();
          }}
        />
      )}
      {activeForm === "payment" && (
        <RecordPaymentForm
          consignment={consignment}
          onDone={async () => {
            setActiveForm(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  variant = "primary",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "primary"
          ? "flex w-full items-center justify-center gap-sm rounded-lg bg-primary py-md text-body-lg font-medium text-on-primary active:opacity-90 disabled:opacity-50"
          : "flex w-full items-center justify-center gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest py-md text-body-lg font-medium text-on-surface active:bg-surface-container-low"
      }
    >
      {icon}
      {label}
    </button>
  );
}

function RecordSaleForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const [quantities, setQuantities, clearDraft] = useDraftStorage<Record<string, string>>(`draft:sale:${consignment.id}`, {});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const items = consignment.items
      .map((item) => ({ consignmentItemId: item.id, quantity: Number(quantities[item.id] ?? 0) }))
      .filter((entry) => entry.quantity > 0);

    if (items.length === 0) {
      setError("Enter at least one sold quantity.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not record sale.");
      return;
    }
    clearDraft();
    await onDone();
  }

  return (
    <div className="mx-md flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <h3 className="text-label-lg text-on-surface">Units Sold</h3>
      {consignment.items.map((item) => (
        <label key={item.id} className="flex flex-col gap-xs">
          <span className="text-body-sm text-on-surface-variant">
            {item.material.name} <span>(held: {remaining(item)})</span>
          </span>
          <input
            type="number"
            min={0}
            step="0.001"
            value={quantities[item.id] ?? ""}
            onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
            className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
          />
        </label>
      ))}
      {error && <p className="text-body-sm text-error">{error}</p>}
      <ActionButton icon={<PackageCheck size={20} />} label={submitting ? "Saving…" : "Save Sale"} onClick={submit} disabled={submitting} />
    </div>
  );
}

function RecordReturnForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const [rows, setRows, clearDraft] = useDraftStorage<Record<string, { quantity: string; qualityStatus: string }>>(
    `draft:return:${consignment.id}`,
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const items = consignment.items
      .map((item) => ({
        consignmentItemId: item.id,
        materialId: item.materialId,
        quantity: Number(rows[item.id]?.quantity ?? 0),
        qualityStatus: rows[item.id]?.qualityStatus || "good",
      }))
      .filter((entry) => entry.quantity > 0);

    if (items.length === 0) {
      setError("Enter at least one returned quantity.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/consignments/${consignment.id}/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: consignment.customer.id, items }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.error === "string" ? body.error : "Could not record return.");
      return;
    }
    clearDraft();
    await onDone();
  }

  return (
    <div className="mx-md flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <h3 className="text-label-lg text-on-surface">Returned Units</h3>
      {consignment.items.map((item) => (
        <div key={item.id} className="flex flex-col gap-xs">
          <span className="text-body-sm text-on-surface-variant">
            {item.material.name} <span>(held: {remaining(item)})</span>
          </span>
          <div className="grid grid-cols-2 gap-sm">
            <input
              type="number"
              min={0}
              step="0.001"
              value={rows[item.id]?.quantity ?? ""}
              onChange={(e) =>
                setRows((prev) => ({ ...prev, [item.id]: { quantity: e.target.value, qualityStatus: prev[item.id]?.qualityStatus ?? "good" } }))
              }
              className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
            />
            <select
              value={rows[item.id]?.qualityStatus ?? "good"}
              onChange={(e) =>
                setRows((prev) => ({ ...prev, [item.id]: { quantity: prev[item.id]?.quantity ?? "0", qualityStatus: e.target.value } }))
              }
              className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
            >
              {returnQualityStatusValues.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      {error && <p className="text-body-sm text-error">{error}</p>}
      <ActionButton icon={<Undo2 size={20} />} label={submitting ? "Saving…" : "Save Return"} onClick={submit} disabled={submitting} />
    </div>
  );
}

function RecordPaymentForm({ consignment, onDone }: { consignment: Consignment; onDone: () => Promise<void> }) {
  const [draft, setDraft, clearDraft] = useDraftStorage(`draft:payment:${consignment.id}`, {
    amount: "",
    paymentMethod: "cash",
    referenceNumber: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const amount = Number(draft.amount);
    if (!(amount > 0)) {
      setError("Enter an amount greater than 0.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: consignment.customer.id,
        consignmentId: consignment.id,
        amount,
        paymentMethod: draft.paymentMethod,
        referenceNumber: draft.referenceNumber || undefined,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      setError(await errorMessage(res, "Could not record payment."));
      return;
    }
    clearDraft();
    await onDone();
  }

  return (
    <div className="mx-md flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-md">
      <h3 className="text-label-lg text-on-surface">Record Payment</h3>
      <input
        type="number"
        min={0}
        step="0.01"
        placeholder="Amount"
        value={draft.amount}
        onChange={(e) => setDraft((prev) => ({ ...prev, amount: e.target.value }))}
        className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
      />
      <select
        value={draft.paymentMethod}
        onChange={(e) => setDraft((prev) => ({ ...prev, paymentMethod: e.target.value }))}
        className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
      >
        {paymentMethodValues.map((method) => (
          <option key={method} value={method}>
            {method.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <input
        placeholder="Reference # (optional)"
        value={draft.referenceNumber}
        onChange={(e) => setDraft((prev) => ({ ...prev, referenceNumber: e.target.value }))}
        className="rounded-md border border-outline-variant bg-surface-container-lowest px-md py-md text-body-lg outline-none focus:border-primary"
      />
      {error && <p className="text-body-sm text-error">{error}</p>}
      <ActionButton icon={<Banknote size={20} />} label={submitting ? "Saving…" : "Save Payment"} onClick={submit} disabled={submitting} />
    </div>
  );
}
