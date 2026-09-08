import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { SupplierLedgerTransactionType } from "@/lib/generated/prisma/client";

type Tx = Prisma.TransactionClient;

// AP mirror of retailer-ledger: append-only, runningBalance recomputed from the
// previous row on every insert. An invoice debits (we owe more), a payment
// credits (we owe less) — so a positive balance means we owe the supplier.
export async function appendSupplierLedgerEntry(
  tx: Tx,
  params: {
    supplierId: string;
    transactionType: SupplierLedgerTransactionType;
    referenceId: string;
    description?: string | null;
    debit?: number | string | Prisma.Decimal;
    credit?: number | string | Prisma.Decimal;
  }
) {
  const last = await tx.supplierLedger.findFirst({
    where: { supplierId: params.supplierId },
    orderBy: { createdAt: "desc" },
  });

  const previousBalance = last?.runningBalance ?? new Prisma.Decimal(0);
  const debit = new Prisma.Decimal(params.debit ?? 0);
  const credit = new Prisma.Decimal(params.credit ?? 0);
  const runningBalance = previousBalance.add(debit).sub(credit);

  return tx.supplierLedger.create({
    data: {
      supplierId: params.supplierId,
      transactionType: params.transactionType,
      referenceId: params.referenceId,
      description: params.description,
      debit,
      credit,
      runningBalance,
    },
  });
}

export function getSupplierLedger(supplierId: string) {
  return prisma.supplierLedger.findMany({
    where: { supplierId },
    orderBy: { createdAt: "asc" },
  });
}

// Read the latest cached runningBalance — never sum the rows client-side.
export async function getSupplierOutstandingBalance(supplierId: string) {
  const last = await prisma.supplierLedger.findFirst({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
  });
  return last?.runningBalance ?? new Prisma.Decimal(0);
}
