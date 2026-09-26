"use client";

import { useEffect, useState } from "react";

interface Metrics {
  collections: {
    outstandingBalance: string;
    collectedToday: string;
    collectedThisMonth: string;
    overdueRetailers: number;
  };
  consignment: {
    activeConsignments: number;
    partiallySettled: number;
    fullySettled: number;
    retailerHeldStockValue: string;
  };
  returns: {
    goodReturnQty: string;
    damagedReturnQty: string;
    expiredReturnQty: string;
    wasteValue: string;
  };
}

function money(value: string) {
  return Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "warning" | "error" }) {
  return (
    <div className="flex flex-col gap-xs rounded-md border border-outline-variant bg-surface-container-lowest p-md">
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p
        className={
          tone === "error"
            ? "text-headline-md text-error"
            : tone === "warning"
              ? "text-headline-md text-warning"
              : "text-headline-md text-on-surface"
        }
      >
        {value}
      </p>
    </div>
  );
}

function StatGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-sm">
      <h3 className="text-label-lg text-on-surface">{title}</h3>
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">{children}</div>
    </div>
  );
}

export function DashboardPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/consignment-metrics")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(typeof body?.error === "string" ? body.error : "Could not load dashboard metrics.");
          return;
        }
        setMetrics(await res.json());
      })
      .catch(() => setError("Could not load dashboard metrics."));
  }, []);

  if (error) return <p className="text-body-md text-error">{error}</p>;
  if (!metrics) return <p className="text-body-md text-on-surface-variant">Loading dashboard…</p>;

  return (
    <div className="flex flex-col gap-lg">
      <StatGroup title="Collections">
        <StatCard label="Outstanding Balance" value={money(metrics.collections.outstandingBalance)} tone="warning" />
        <StatCard label="Collected Today" value={money(metrics.collections.collectedToday)} />
        <StatCard label="Collected This Month" value={money(metrics.collections.collectedThisMonth)} />
        <StatCard
          label="Overdue Retailers"
          value={String(metrics.collections.overdueRetailers)}
          tone={metrics.collections.overdueRetailers > 0 ? "error" : undefined}
        />
      </StatGroup>

      <StatGroup title="Consignment">
        <StatCard label="Active Consignments" value={String(metrics.consignment.activeConsignments)} />
        <StatCard label="Partially Settled" value={String(metrics.consignment.partiallySettled)} />
        <StatCard label="Fully Settled" value={String(metrics.consignment.fullySettled)} />
        <StatCard label="Retailer Held Stock Value" value={money(metrics.consignment.retailerHeldStockValue)} />
      </StatGroup>

      <StatGroup title="Returns">
        <StatCard label="Good Returns (qty)" value={metrics.returns.goodReturnQty} />
        <StatCard label="Damaged Returns (qty)" value={metrics.returns.damagedReturnQty} />
        <StatCard label="Expired Returns (qty)" value={metrics.returns.expiredReturnQty} />
        <StatCard label="Waste Value" value={money(metrics.returns.wasteValue)} tone="error" />
      </StatGroup>
    </div>
  );
}
