import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appendSupplierLedgerEntry } from "@/lib/services/supplier-ledger";

type Tx = Prisma.TransactionClient;

const include = {
  supplier: true,
  grn: { select: { id: true, grnNo: true } },
  payments: { orderBy: { createdAt: "asc" } }, // last element = latest payment (see supplier-payment-panel reprint)
} as const;

export function listSupplierInvoices() {
  return prisma.supplierInvoice.findMany({ include, orderBy: { createdAt: "desc" } });
}

export function getSupplierInvoice(id: string) {
  return prisma.supplierInvoice.findUnique({ where: { id }, include });
}

export interface SupplierInvoiceInput {
  supplierId: string;
  grnId?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  totalAmount: number;
}

function generateSupplierInvoiceNo() {
  return `SINV-${Date.now()}`;
}

// Status is derived from recorded supplier payments — never hand-set
// (mirrors recomputeInvoiceStatus). No returns dimension this pass.
export async function recomputeSupplierInvoiceStatus(tx: Tx, invoiceId: string) {
  const invoice = await tx.supplierInvoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const paidAgg = await tx.supplierPayment.aggregate({
    where: { supplierInvoiceId: invoiceId },
    _sum: { amount: true },
  });
  const paid = paidAgg._sum.amount ?? new Prisma.Decimal(0);

  const status = paid.gte(invoice.totalAmount)
    ? "paid"
    : paid.gt(0)
      ? "partially_paid"
      : "unpaid";

  if (status !== invoice.status) {
    await tx.supplierInvoice.update({ where: { id: invoiceId }, data: { status } });
  }
}

export async function createSupplierInvoice(data: SupplierInvoiceInput, createdBy?: string | null) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.create({
      data: {
        invoiceNo: data.invoiceNo || generateSupplierInvoiceNo(),
        supplierId: data.supplierId,
        grnId: data.grnId,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
        totalAmount: data.totalAmount,
        createdBy,
      },
    });

    await appendSupplierLedgerEntry(tx, {
      supplierId: data.supplierId,
      transactionType: "invoice",
      referenceId: invoice.id,
      description: `Invoice ${invoice.invoiceNo}`,
      debit: data.totalAmount,
    });

    return tx.supplierInvoice.findUniqueOrThrow({ where: { id: invoice.id }, include });
  });
}
