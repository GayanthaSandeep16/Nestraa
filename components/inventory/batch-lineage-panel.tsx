"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

interface BatchDetail {
  id: string;
  batchNo: string;
  batchType: string;
  quantity: string;
  qcResult: "pass" | "fail" | "conditional_pass" | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  material: { name: string; sku: string };
  warehouse: { name: string };
  uom: { code: string };
}

interface LineageNode {
  batchId: string;
  batchNo: string;
  depth: number;
  direction: "input" | "output";
  quantity: string;
}

interface LineageResult {
  batch: BatchDetail;
  lineage: LineageNode[];
}

const qcTones: Record<string, StatusTone> = {
  pass: "success",
  fail: "error",
  conditional_pass: "warning",
};

export function BatchLineagePanel() {
  const [batchNo, setBatchNo] = useState("");
  const [result, setResult] = useState<LineageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = batchNo.trim();
    if (!trimmed) return;

    setLoading(true);
    const res = await fetch(`/api/inventory/batches/by-no/${encodeURIComponent(trimmed)}/lineage`);
    setLoading(false);

    if (!res.ok) {
      setError("Batch not found.");
      return;
    }

    setResult(await res.json());
  }

  const inputs = result?.lineage.filter((node) => node.direction === "input") ?? [];
  const outputs = result?.lineage.filter((node) => node.direction === "output") ?? [];

  return (
    <div className="flex flex-col gap-md">
      <form onSubmit={handleSearch} className="flex gap-sm">
        <Input
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          placeholder="Enter batch number (e.g. GRN-...)"
          className="max-w-[24rem]"
        />
        <Button type="submit" disabled={loading}>
          <Search size={16} />
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && <p className="text-body-sm text-error">{error}</p>}

      {result && (
        <div className="flex flex-col gap-md rounded-md border border-outline-variant p-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-headline-sm text-on-surface">{result.batch.batchNo}</h3>
            {result.batch.qcResult && (
              <StatusBadge label={result.batch.qcResult.replace(/_/g, " ")} tone={qcTones[result.batch.qcResult]} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-sm text-body-sm text-on-surface-variant sm:grid-cols-4">
            <div>
              <p className="text-label-sm uppercase">Material</p>
              <p className="text-on-surface">{result.batch.material.name}</p>
            </div>
            <div>
              <p className="text-label-sm uppercase">Warehouse</p>
              <p className="text-on-surface">{result.batch.warehouse.name}</p>
            </div>
            <div>
              <p className="text-label-sm uppercase">Quantity</p>
              <p className="text-on-surface">
                {result.batch.quantity} {result.batch.uom.code}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase">Type</p>
              <p className="text-on-surface">{result.batch.batchType}</p>
            </div>
            <div>
              <p className="text-label-sm uppercase">Manufactured</p>
              <p className="text-on-surface">
                {result.batch.manufactureDate ? new Date(result.batch.manufactureDate).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-label-sm uppercase">Expires</p>
              <p className="text-on-surface">
                {result.batch.expiryDate ? new Date(result.batch.expiryDate).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div>
              <h4 className="mb-xs text-label-lg text-on-surface">Consumed From (Inputs)</h4>
              {inputs.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No input batches — this is a source batch.</p>
              ) : (
                <ul className="flex flex-col gap-xs">
                  {inputs.map((node) => (
                    <li
                      key={`${node.batchId}-${node.depth}`}
                      style={{ paddingLeft: `${(node.depth - 1) * 12}px` }}
                      className="font-mono text-body-sm text-on-surface"
                    >
                      {node.batchNo}{" "}
                      <span className="text-on-surface-variant">({node.quantity})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-xs text-label-lg text-on-surface">Produced Into (Outputs)</h4>
              {outputs.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No output batches — not yet consumed.</p>
              ) : (
                <ul className="flex flex-col gap-xs">
                  {outputs.map((node) => (
                    <li
                      key={`${node.batchId}-${node.depth}`}
                      style={{ paddingLeft: `${(node.depth - 1) * 12}px` }}
                      className="font-mono text-body-sm text-on-surface"
                    >
                      {node.batchNo}{" "}
                      <span className="text-on-surface-variant">({node.quantity})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
