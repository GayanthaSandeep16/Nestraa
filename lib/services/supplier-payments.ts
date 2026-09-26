import { UserError } from "@/lib/api/errors";
import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod } from "@/lib/generated/prisma/client";
import { appendSupplierLedgerEntry } from "@/lib/services/supplier-ledger";
import { recomputeSupplierInvoiceStatus } from "@/lib/services/supplier-invoices";

const include = { supplier: true, invoice: true, recorder: true } as const;

export function listSupplierPayments(filters?: { supplierId?: string; supplierInvoiceId?: string }) {
  return prisma.supplierPayment.findMany({
    where: {
      supplierId: filters?.supplierId,
      supplierInvoiceId: filters?.supplierInvoiceId,
    },
    include,
    orderBy: { createdAt: "desc" },
  });
}

export function getSupplierPayment(id: string) {
  return prisma.supplierPayment.findUnique({ where: { id }, include });
}

export interface SupplierPaymentInput {
  supplierId: string;
  supplierInvoiceId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
}

// Append-only — a correction is a new offsetting row, not an edit.
export function recordSupplierPayment(data: SupplierPaymentInput, recordedBy?: string | null) {
  return prisma.$transaction(async (tx) => {
    if (data.supplierInvoiceId) {
      const invoice = await tx.supplierInvoice.findUniqueOrThrow({ where: { id: data.supplierInvoiceId } });
      if (invoice.supplierId !== data.supplierId) throw new UserError("That invoice belongs to a different supplier.");
    }

    const payment = await tx.supplierPayment.create({
      data: {
        ...data,
        recordedBy,
      },
    });

    await appendSupplierLedgerEntry(tx, {
      supplierId: data.supplierId,
      transactionType: "payment",
      referenceId: payment.id,
      description: `Payment (${data.paymentMethod})${data.referenceNumber ? ` — ${data.referenceNumber}` : ""}`,
      credit: data.amount,
    });

    if (data.supplierInvoiceId) {
      await recomputeSupplierInvoiceStatus(tx, data.supplierInvoiceId);
    }

    return tx.supplierPayment.findUniqueOrThrow({ where: { id: payment.id }, include });
  });
}
