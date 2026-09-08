"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/select";
import { fetchJson } from "@/lib/http";

interface Retailer {
  id: string;
  customerId: string;
  route: string | null;
  customer: { id: string; name: string };
  assignedSalesRep: { id: string; fullName: string } | null;
}

interface SalesRep {
  id: string;
  fullName: string;
}

export function SalesRepsPanel() {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    return Promise.all([
      fetchJson<Retailer[]>("/api/retailers"),
      fetchJson<{ salesReps: SalesRep[] }>("/api/lookups"),
    ]).then(([r, l]) => {
      setRetailers(r ?? []);
      setReps(l?.salesReps ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function reassign(customerId: string, repId: string) {
    setError(null);
    setSavingId(customerId);
    const res = await fetch(`/api/admin/retailer-assignments/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedSalesRepId: repId || null }),
    });
    setSavingId(null);

    if (!res.ok) {
      setError("Could not reassign retailer.");
      return;
    }
    await load();
  }

  if (loading) return <p className="text-body-md text-on-surface-variant">Loading…</p>;

  const groups = [
    ...reps.map((rep) => ({
      key: rep.id,
      title: rep.fullName,
      rows: retailers.filter((r) => r.assignedSalesRep?.id === rep.id),
    })),
    {
      key: "unassigned",
      title: "Unassigned",
      rows: retailers.filter((r) => !r.assignedSalesRep),
    },
  ];

  return (
    <div className="flex flex-col gap-lg">
      {error && <p className="text-body-sm text-error">{error}</p>}

      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-sm">
          <h3 className="text-label-lg text-on-surface">
            {group.title} <span className="text-on-surface-variant">({group.rows.length})</span>
          </h3>

          {group.rows.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No retailers.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-outline-variant">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-md py-sm text-label-sm uppercase text-on-surface-variant">Retailer</th>
                    <th className="px-md py-sm text-label-sm uppercase text-on-surface-variant">Route</th>
                    <th className="px-md py-sm text-label-sm uppercase text-on-surface-variant">Assigned Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((r) => (
                    <tr key={r.id} className="border-t border-outline-variant text-body-md text-on-surface">
                      <td className="px-md py-sm font-medium">{r.customer.name}</td>
                      <td className="px-md py-sm">{r.route || "—"}</td>
                      <td className="px-md py-sm">
                        <Select
                          value={r.assignedSalesRep?.id ?? ""}
                          disabled={savingId === r.customerId}
                          onChange={(e) => reassign(r.customerId, e.target.value)}
                          className="w-48"
                        >
                          <option value="">Unassigned</option>
                          {reps.map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.fullName}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
