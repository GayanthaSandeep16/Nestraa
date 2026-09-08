import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";

type Tx = Prisma.TransactionClient;

const include = {
  customer: true,
  warehouse: true,
  salesRep: true,
  items: { include: { material: true, batch: true } },
} as const;

export function listConsignments(opts?: { skip?: number; take?: number }) {
  return prisma.consignment.findMany({ include, orderBy: { createdAt: "desc" }, ...opts });
}

export function countConsignments() {
  return prisma.consignment.count();
}

export function getConsignment(id: string) {
  return prisma.consignment.findUnique({ where: { id }, include });
}

export interface ConsignmentItemInput {
  materialId: string;
  batchId?: string | null;
  quantityDelivered: number;
  unitPrice: number;
}

export interface ConsignmentInput {
  customerId: string;
  warehouseId: string;
  salesRepId?: string | null;
  notes?: string | null;
  items: ConsignmentItemInput[];
}

function generateConsignmentNumber() {
  return `CON-${Date.now()}`;
}

// Draft only — no stock or money moves until deliverConsignment.
export function createConsignment(data: ConsignmentInput, createdBy?: string | null) {
  const { items, ...header } = data;
  return prisma.consignment.create({
    data: {
      ...header,
      consignmentNumber: generateConsignmentNumber(),
      createdBy,
      items: { create: items },
    },
    include,
  });
}

// Delivery moves stock from the warehouse to the retailer (two ledger rows —
// out at the warehouse, in at the retailer, both under the same
// sourceReferenceId) and bills the retailer for the full delivered value,
// matching the worked ledger example in the spec (goods on consignment are
// billed on delivery; returns credit the balance back down).
export function deliverConsignment(id: string, actorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const consignment = await tx.consignment.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { material: true } } },
    });

    if (consignment.status !== "draft") {
      throw new Error("Only draft consignments can be delivered");
    }

    let totalValue = new Prisma.Decimal(0);

    for (const item of consignment.items) {
      const movementBase = {
        materialId: item.materialId,
        quantity: item.quantityDelivered,
        uomId: item.material.baseUomId,
        source: "consignment_delivery" as const,
        sourceReferenceId: consignment.id,
        createdBy: actorId,
      };

      await tx.inventoryMovement.create({
        data: { ...movementBase, warehouseId: consignment.warehouseId, direction: "out" },
      });
      await tx.inventoryMovement.create({
        data: { ...movementBase, retailerId: consignment.customerId, direction: "in" },
      });

      totalValue = totalValue.add(item.unitPrice.mul(item.quantityDelivered));
    }

    await appendLedgerEntry(tx, {
      customerId: consignment.customerId,
      transactionType: "delivery",
      referenceId: consignment.id,
      description: `Delivery ${consignment.consignmentNumber}`,
      debit: totalValue,
    });

    await tx.consignment.update({ where: { id }, data: { status: "delivered" } });

    return tx.consignment.findUniqueOrThrow({ where: { id }, include });
  });
}

export interface ConsignmentSaleItemInput {
  consignmentItemId: string;
  quantity: number;
}

// Retailer-reported sales remove stock from the retailer-held ledger. Money
// was already billed in full at delivery, so this does not touch the
// retailer ledger — it only keeps the physical stock picture accurate.
export function recordConsignmentSale(
  consignmentId: string,
  items: ConsignmentSaleItemInput[],
  actorId?: string | null
) {
  return prisma.$transaction(async (tx) => {
    const consignment = await tx.consignment.findUniqueOrThrow({ where: { id: consignmentId } });
    if (consignment.status === "draft" || consignment.status === "cancelled") {
      throw new Error("Consignment has not been delivered yet");
    }

    for (const entry of items) {
      const item = await tx.consignmentItem.findUniqueOrThrow({
        where: { id: entry.consignmentItemId },
        include: { material: true },
      });

      const remaining = item.quantityDelivered.sub(item.quantitySold).sub(item.quantityReturned);
      if (remaining.lt(entry.quantity)) {
        throw new Error(`Sale quantity exceeds remaining held stock for ${item.material.name}`);
      }

      await tx.inventoryMovement.create({
        data: {
          materialId: item.materialId,
          retailerId: consignment.customerId,
          direction: "out",
          quantity: entry.quantity,
          uomId: item.material.baseUomId,
          source: "consignment_sale",
          sourceReferenceId: consignment.id,
          createdBy: actorId,
        },
      });

      await tx.consignmentItem.update({
        where: { id: item.id },
        data: { quantitySold: { increment: entry.quantity } },
      });
    }

    await recomputeConsignmentStatus(tx, consignmentId);
    return tx.consignment.findUniqueOrThrow({ where: { id: consignmentId }, include });
  });
}

interface ConsignmentItemLike {
  quantityDelivered: Prisma.Decimal;
  quantitySold: Prisma.Decimal;
  quantityReturned: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
}

// Single source of truth for a consignment's money position — used by both
// status recomputation and PDF generation, so the two never drift apart.
export function computeConsignmentFinancials(items: ConsignmentItemLike[], paidAmount: Prisma.Decimal) {
  const deliveredValue = items.reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantityDelivered)), new Prisma.Decimal(0));
  const returnedValue = items.reduce((sum, item) => sum.add(item.unitPrice.mul(item.quantityReturned)), new Prisma.Decimal(0));
  const outstanding = deliveredValue.sub(returnedValue).sub(paidAmount);
  const allAccountedFor = items.every((item) => item.quantitySold.add(item.quantityReturned).gte(item.quantityDelivered));
  const anyActivity = items.some((item) => item.quantitySold.gt(0) || item.quantityReturned.gt(0));

  return { deliveredValue, returnedValue, outstanding, allAccountedFor, anyActivity };
}

export async function getConsignmentFinancials(consignmentId: string) {
  const consignment = await prisma.consignment.findUniqueOrThrow({ where: { id: consignmentId }, include: { items: true } });
  const paid = await prisma.payment.aggregate({ where: { consignmentId }, _sum: { amount: true } });
  return computeConsignmentFinancials(consignment.items, paid._sum.amount ?? new Prisma.Decimal(0));
}

// Status is derived from the consignment's own items and its own money
// movements (delivery debit, its returns' credit, and payments tagged to
// it) — never hand-set, per the "never calculate balances manually" rule.
export async function recomputeConsignmentStatus(tx: Tx, consignmentId: string) {
  const consignment = await tx.consignment.findUniqueOrThrow({
    where: { id: consignmentId },
    include: { items: true },
  });

  if (consignment.status === "draft" || consignment.status === "cancelled") return;

  const paid = await tx.payment.aggregate({ where: { consignmentId }, _sum: { amount: true } });
  const { outstanding, allAccountedFor, anyActivity } = computeConsignmentFinancials(
    consignment.items,
    paid._sum.amount ?? new Prisma.Decimal(0)
  );
  const paidAny = (paid._sum.amount ?? new Prisma.Decimal(0)).gt(0);

  const status = allAccountedFor && outstanding.lte(0) ? "fully_settled" : anyActivity || paidAny ? "partially_settled" : "delivered";

  if (status !== consignment.status) {
    await tx.consignment.update({ where: { id: consignmentId }, data: { status } });
  }
}
