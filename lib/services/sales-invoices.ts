import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";

type Tx = Prisma.TransactionClient;

const include = {
  customer: true,
  salesOrder: { select: { id: true, orderNo: true } },
  items: { include: { material: true } },
  payments: { orderBy: { createdAt: "asc" } }, // last element = latest receipt (see receipts-panel reprint)
} as const;

export function listSalesInvoices(opts?: { skip?: number; take?: number }) {
  return prisma.salesInvoice.findMany({ include, orderBy: { createdAt: "desc" }, ...opts });
}

export function countSalesInvoices() {
  return prisma.salesInvoice.count();
}

export function getSalesInvoice(id: string) {
  return prisma.salesInvoice.findUnique({ where: { id }, include });
}

export interface SalesInvoiceItemInput {
  materialId: string;
  quantity: number;
  unitPrice: number;
  warehouseId?: string | null; // presence triggers a stock-out movement for the line
  batchId?: string | null; // persisted on the line and on the movement
}

export interface SalesInvoiceInput {
  customerId: string;
  salesOrderId?: string;
  invoiceDate?: string;
  taxAmount?: number;
  items: SalesInvoiceItemInput[];
}

function generateInvoiceNo() {
  return `INV-${Date.now()}`;
}

// Invoice status is derived from its receipts and any returns against it —
// never hand-set (mirrors recomputeConsignmentStatus).
export async function recomputeInvoiceStatus(tx: Tx, invoiceId: string) {
  const invoice = await tx.salesInvoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const [paidAgg, returnItems] = await Promise.all([
    tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } }),
    tx.salesReturnItem.findMany({
      where: { return: { invoiceId } },
      select: { quantity: true, unitPrice: true },
    }),
  ]);

  const paid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
  const returned = returnItems.reduce(
    (sum, item) => sum.add(item.unitPrice.mul(item.quantity)),
    new Prisma.Decimal(0)
  );
  const net = invoice.totalAmount.sub(returned); // a return reduces what's owed

  const status = net.lte(0) || paid.gte(net) ? "paid" : paid.gt(0) ? "partially_paid" : "unpaid";

  if (status !== invoice.status) {
    await tx.salesInvoice.update({ where: { id: invoiceId }, data: { status } });
  }
}

export async function createSalesInvoice(data: SalesInvoiceInput, createdBy?: string | null) {
  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = data.taxAmount ?? 0;

  return prisma.$transaction(async (tx) => {
    const materialIds = [...new Set(data.items.map((item) => item.materialId))];
    const materials = await tx.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, baseUomId: true },
    });
    const baseUomByMaterial = new Map(materials.map((m) => [m.id, m.baseUomId]));

    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNo: generateInvoiceNo(),
        customerId: data.customerId,
        salesOrderId: data.salesOrderId,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        totalAmount: subtotal + taxAmount,
        taxAmount,
        createdBy,
        items: {
          create: data.items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchId: item.batchId ?? null,
          })),
        },
      },
    });

    // Stock leaves the warehouse for any line that names one. Lines without a
    // warehouse (walk-in / non-inventory) move nothing. No availability guard,
    // matching the house "visible, not blocking" stance.
    for (const item of data.items) {
      if (!item.warehouseId) continue;
      const uomId = baseUomByMaterial.get(item.materialId);
      if (!uomId) continue;
      await tx.inventoryMovement.create({
        data: {
          materialId: item.materialId,
          batchId: item.batchId ?? null,
          warehouseId: item.warehouseId,
          direction: "out",
          quantity: item.quantity,
          uomId,
          source: "sale",
          sourceReferenceId: invoice.id,
          createdBy,
        },
      });
    }

    await appendLedgerEntry(tx, {
      customerId: data.customerId,
      transactionType: "invoice",
      referenceId: invoice.id,
      description: `Invoice ${invoice.invoiceNo}`,
      debit: subtotal + taxAmount,
    });

    await recomputeInvoiceStatus(tx, invoice.id);

    return tx.salesInvoice.findUniqueOrThrow({ where: { id: invoice.id }, include });
  });
}
