import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getExpiringBatches } from "@/lib/services/inventory";

export default async function Home() {
  const [materialCount, activeCustomerCount, expiringBatches] = await Promise.all([
    prisma.material.count(),
    prisma.customer.count({ where: { isActive: true, deletedAt: null } }),
    getExpiringBatches(),
  ]);

  const cards = [
    { label: "Total SKUs", value: materialCount },
    { label: "Active Customers", value: activeCustomerCount },
    { label: "Expiring Batches (≤30 days)", value: expiringBatches.length },
  ];

  return (
    <div className="flex flex-1 flex-col gap-lg bg-surface p-md md:p-xl">
      <h1 className="font-display text-display text-on-surface">Nestraa</h1>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
          >
            <dt className="text-label-sm text-on-surface-variant">{card.label}</dt>
            <dd className="text-headline-md text-on-surface">{card.value}</dd>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-label-lg text-on-surface">Expiring Soon</h2>
          <Link href="/reports" className="text-body-sm text-primary hover:underline">
            View all reports
          </Link>
        </div>

        {expiringBatches.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">No batches expiring within 30 days.</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {expiringBatches.slice(0, 5).map((batch) => (
              <li
                key={batch.batchNo}
                className="flex items-center justify-between border-b border-outline-variant py-xs text-body-sm last:border-b-0"
              >
                <span className="text-on-surface">{batch.material?.name ?? "—"}</span>
                <span className="font-mono text-on-surface-variant">
                  {batch.quantity.toString()} {batch.material?.baseUom.code ?? ""}
                </span>
                <span className="text-on-surface-variant">
                  {new Date(batch.expiryDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
