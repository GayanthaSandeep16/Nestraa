import { prisma } from "@/lib/db/prisma";
import type { PaymentMethod } from "@/lib/generated/prisma/client";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";
import { recomputeConsignmentStatus } from "@/lib/services/consignments";

export function listPayments(filters?: { customerId?: string; consignmentId?: string }) {
  return prisma.payment.findMany({
    where: { customerId: filters?.customerId, consignmentId: filters?.consignmentId },
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
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
}

// Payments are append-only — a correction is a new offsetting row, not an
// edit/delete of a past payment.
export function recordPayment(data: PaymentInput, recordedBy?: string | null) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { ...data, recordedBy },
    });

    await appendLedgerEntry(tx, {
      customerId: data.customerId,
      transactionType: "payment",
      referenceId: payment.id,
      description: `Payment (${data.paymentMethod})${data.referenceNumber ? ` — ${data.referenceNumber}` : ""}`,
      credit: data.amount,
    });

    if (data.consignmentId) {
      await recomputeConsignmentStatus(tx, data.consignmentId);
    }

    return tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { customer: true, consignment: true, recorder: true },
    });
  });
}
