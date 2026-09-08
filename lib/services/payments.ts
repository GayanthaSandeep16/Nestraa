import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod } from "@/lib/generated/prisma/client";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";
import { recomputeConsignmentStatus } from "@/lib/services/consignments";

export function listPayments(filters?: { customerId?: string; consignmentId?: string; invoiceId?: string }) {
  return prisma.payment.findMany({
    where: {
      customerId: filters?.customerId,
      consignmentId: filters?.consignmentId,
      invoiceId: filters?.invoiceId,
    },
    include: { customer: true, consignment: true, recorder: true },
    orderBy: { createdAt: "desc" },
  });
}

export function getPayment(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    include: { customer: true, consignment: true, recorder: true },
  });
}

export interface PaymentInput {
  customerId: string;
  consignmentId?: string | null;
  invoiceId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

// Payments are append-only — a correction is a new offsetting row, not an
// edit/delete of a past payment.
export function recordPayment(data: PaymentInput, recordedBy?: string | null) {
  return prisma.$transaction(async (tx) => {
    const { paymentDate, ...rest } = data;
    const payment = await tx.payment.create({
      data: {
        ...rest,
        recordedBy,
        ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {}),
      },
    });

    await appendLedgerEntry(tx, {
      customerId: data.customerId,
      transactionType: "payment",
      referenceId: payment.id,
      description: `${data.invoiceId ? "Receipt" : "Payment"} (${data.paymentMethod})${data.referenceNumber ? ` — ${data.referenceNumber}` : ""}`,
      credit: data.amount,
    });

    if (data.consignmentId) {
      await recomputeConsignmentStatus(tx, data.consignmentId);
    }

    if (data.invoiceId) {
      const { recomputeInvoiceStatus } = await import("@/lib/services/sales-invoices");
      await recomputeInvoiceStatus(tx, data.invoiceId);
    }

    return tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { customer: true, consignment: true, recorder: true },
    });
  });
}
