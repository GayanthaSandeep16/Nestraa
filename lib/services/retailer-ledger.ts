import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { LedgerTransactionType } from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// Append-only: the running balance is a cached snapshot recomputed from the
// previous row on every insert, never hand-edited (mirrors Batch.unitCost).
export async function appendLedgerEntry(
  tx: Tx,
  params: {
    customerId: string;
    transactionType: LedgerTransactionType;
    referenceId: string;
    description?: string | null;
    debit?: number | string | Prisma.Decimal;
    credit?: number | string | Prisma.Decimal;
  }
) {
  const last = await tx.retailerLedger.findFirst({
    where: { customerId: params.customerId },
    orderBy: { createdAt: "desc" },
  });

  const previousBalance = last?.runningBalance ?? new Prisma.Decimal(0);
  const debit = new Prisma.Decimal(params.debit ?? 0);
  const credit = new Prisma.Decimal(params.credit ?? 0);
  const runningBalance = previousBalance.add(debit).sub(credit);

  return tx.retailerLedger.create({
    data: {
      customerId: params.customerId,
      transactionType: params.transactionType,
      referenceId: params.referenceId,
      description: params.description,
      debit,
      credit,
      runningBalance,
    },
  });
}

// Unpaginated: ascending (running-balance reads top-to-bottom), used by the PDF
// statement. Paginated: descending so page 1 is the most recent activity — each
// row still carries its own cached runningBalance so order doesn't affect it.
export function getLedger(customerId: string, opts?: { skip?: number; take?: number }) {
  return prisma.retailerLedger.findMany({
    where: { customerId },
    orderBy: { createdAt: opts ? "desc" : "asc" },
    ...opts,
  });
}

export function countLedger(customerId: string) {
  return prisma.retailerLedger.count({ where: { customerId } });
}

// Never sum ledger rows client-side for a balance — always read the latest
// cached runningBalance, per the "never calculate manually" rule.
export async function getOutstandingBalance(customerId: string) {
  const last = await prisma.retailerLedger.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return last?.runningBalance ?? new Prisma.Decimal(0);
}
