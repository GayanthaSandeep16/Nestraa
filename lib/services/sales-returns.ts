import { Prisma } from "@/lib/generated/prisma/client";
import type { ReturnQualityStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";

const DEFAULT_WAREHOUSE_NAME = "Main Warehouse";
const DAMAGED_WAREHOUSE_NAME = "Damaged Stock";
const WASTE_WAREHOUSE_NAME = "Waste Stock";

const include = {
  items: { include: { material: true } },
  invoice: { select: { id: true, invoiceNo: true } },
  customer: true,
  creator: true,
} as const;

export function listSalesReturns(opts?: { skip?: number; take?: number }) {
  return prisma.salesReturn.findMany({ include, orderBy: { createdAt: "desc" }, ...opts });
}

export function countSalesReturns() {
  return prisma.salesReturn.count();
}

export interface SalesReturnItemInput {
  materialId: string;
  quantity: number;
  unitPrice: number;
  qualityStatus: ReturnQualityStatus;
}

export interface SalesReturnInput {
  invoiceId?: string | null;
  customerId?: string | null;
  reason?: string | null;
  items: SalesReturnItemInput[];
}

function generateReturnNo() {
  return `SR-${Date.now()}`;
}

// Mirrors recordConsignmentReturn: one restock movement per line (good → the
// invoice line's origin warehouse or the default; damaged/expired → the two
// seeded system warehouses), a credit to the customer's AR ledger, and an
// invoice-status recompute when the return is tied to an invoice.
export function createSalesReturn(data: SalesReturnInput, actorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const invoice = data.invoiceId
      ? await tx.salesInvoice.findUniqueOrThrow({
          where: { id: data.invoiceId },
          include: { items: { include: { batch: true } } },
        })
      : null;

    const customerId = invoice?.customerId ?? data.customerId;
    if (!customerId) throw new Error("Invoice or customer is required");

    const [defaultWarehouse, damagedWarehouse, wasteWarehouse] = await Promise.all([
      tx.warehouse.findFirstOrThrow({ where: { name: DEFAULT_WAREHOUSE_NAME } }),
      tx.warehouse.findFirstOrThrow({ where: { name: DAMAGED_WAREHOUSE_NAME } }),
      tx.warehouse.findFirstOrThrow({ where: { name: WASTE_WAREHOUSE_NAME } }),
    ]);

    // Over-return guard — only meaningful when tied to an invoice.
    if (invoice) {
      const invoicedByMaterial = new Map<string, Prisma.Decimal>();
      for (const line of invoice.items) {
        invoicedByMaterial.set(
          line.materialId,
          (invoicedByMaterial.get(line.materialId) ?? new Prisma.Decimal(0)).add(line.quantity)
        );
      }
      const prior = await tx.salesReturnItem.groupBy({
        by: ["materialId"],
        where: { return: { invoiceId: invoice.id } },
        _sum: { quantity: true },
      });
      const returnedByMaterial = new Map(
        prior.map((row) => [row.materialId, row._sum.quantity ?? new Prisma.Decimal(0)])
      );

      for (const entry of data.items) {
        const invoiced = invoicedByMaterial.get(entry.materialId) ?? new Prisma.Decimal(0);
        const already = returnedByMaterial.get(entry.materialId) ?? new Prisma.Decimal(0);
        if (already.add(entry.quantity).gt(invoiced)) {
          throw new Error(`Return quantity exceeds invoiced quantity for material ${entry.materialId}`);
        }
      }
    }

    const materialIds = [...new Set(data.items.map((i) => i.materialId))];
    const materials = await tx.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, baseUomId: true },
    });
    const baseUomByMaterial = new Map(materials.map((m) => [m.id, m.baseUomId]));

    // Origin warehouse for "good" returns: the invoice line's batch warehouse
    // if we can find one, else the default warehouse.
    const originByMaterial = new Map<string, string>();
    for (const line of invoice?.items ?? []) {
      if (line.batch?.warehouseId && !originByMaterial.has(line.materialId)) {
        originByMaterial.set(line.materialId, line.batch.warehouseId);
      }
    }

    const salesReturn = await tx.salesReturn.create({
      data: {
        returnNo: generateReturnNo(),
        invoiceId: invoice?.id,
        customerId,
        reason: data.reason,
        createdBy: actorId,
        items: {
          create: data.items.map((i) => ({
            materialId: i.materialId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            qualityStatus: i.qualityStatus,
          })),
        },
      },
    });

    let creditValue = new Prisma.Decimal(0);

    for (const entry of data.items) {
      const uomId = baseUomByMaterial.get(entry.materialId);
      if (!uomId) throw new Error(`Unknown material ${entry.materialId}`);

      const warehouseId =
        entry.qualityStatus === "good"
          ? originByMaterial.get(entry.materialId) ?? defaultWarehouse.id
          : entry.qualityStatus === "damaged"
            ? damagedWarehouse.id
            : wasteWarehouse.id;

      await tx.inventoryMovement.create({
        data: {
          materialId: entry.materialId,
          warehouseId,
          direction: "in",
          quantity: entry.quantity,
          uomId,
          source: "sales_return",
          sourceReferenceId: salesReturn.id,
          createdBy: actorId,
        },
      });

      creditValue = creditValue.add(new Prisma.Decimal(entry.unitPrice).mul(entry.quantity));
    }

    if (creditValue.gt(0)) {
      await appendLedgerEntry(tx, {
        customerId,
        transactionType: "return",
        referenceId: salesReturn.id,
        description: `Return ${salesReturn.returnNo}`,
        credit: creditValue,
      });
    }

    if (invoice) {
      const { recomputeInvoiceStatus } = await import("@/lib/services/sales-invoices");
      await recomputeInvoiceStatus(tx, invoice.id);
    }

    return tx.salesReturn.findUniqueOrThrow({ where: { id: salesReturn.id }, include });
  });
}
