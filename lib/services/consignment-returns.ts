import { UserError } from "@/lib/api/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ReturnQualityStatus } from "@/lib/generated/prisma/client";
import { appendLedgerEntry } from "@/lib/services/retailer-ledger";
import { recomputeConsignmentStatus } from "@/lib/services/consignments";

const DAMAGED_WAREHOUSE_NAME = "Damaged Stock";
const WASTE_WAREHOUSE_NAME = "Waste Stock";

const movementSourceByQuality: Record<ReturnQualityStatus, "consignment_return_good" | "consignment_return_damaged" | "consignment_return_expired"> = {
  good: "consignment_return_good",
  damaged: "consignment_return_damaged",
  expired: "consignment_return_expired",
};

export function listConsignmentReturns(consignmentId?: string) {
  return prisma.consignmentReturn.findMany({
    where: { consignmentId },
    include: { items: { include: { material: true } }, verifier: true, creator: true },
    orderBy: { createdAt: "desc" },
  });
}

export interface ConsignmentReturnItemInput {
  consignmentItemId: string;
  materialId: string;
  quantity: number;
  qualityStatus: ReturnQualityStatus;
}

export interface ConsignmentReturnInput {
  consignmentId: string;
  customerId: string;
  notes?: string | null;
  items: ConsignmentReturnItemInput[];
}

// Good returns go back to the consignment's origin warehouse; damaged/
// expired returns route into the two seeded system warehouses instead of a
// bespoke "location type", reusing the existing warehouse-as-location
// pattern.
export function recordConsignmentReturn(data: ConsignmentReturnInput, actorId?: string | null) {
  const { items, consignmentId, customerId, notes } = data;

  return prisma.$transaction(async (tx) => {
    const consignment = await tx.consignment.findUniqueOrThrow({ where: { id: consignmentId } });

    const [damagedWarehouse, wasteWarehouse] = await Promise.all([
      tx.warehouse.findFirstOrThrow({ where: { name: DAMAGED_WAREHOUSE_NAME } }),
      tx.warehouse.findFirstOrThrow({ where: { name: WASTE_WAREHOUSE_NAME } }),
    ]);

    const consignmentReturn = await tx.consignmentReturn.create({
      data: {
        consignmentId,
        customerId,
        notes,
        verifiedBy: actorId,
        createdBy: actorId,
        items: { create: items },
      },
    });

    let returnedValue = new Prisma.Decimal(0);

    for (const entry of items) {
      const consignmentItem = await tx.consignmentItem.findUniqueOrThrow({
        where: { id: entry.consignmentItemId },
        include: { material: true },
      });

      const remaining = consignmentItem.quantityDelivered
        .sub(consignmentItem.quantitySold)
        .sub(consignmentItem.quantityReturned);
      if (remaining.lt(entry.quantity)) {
        throw new UserError(`Return quantity exceeds remaining held stock for ${consignmentItem.material.name}`);
      }

      const source = movementSourceByQuality[entry.qualityStatus];
      const destinationWarehouseId =
        entry.qualityStatus === "good"
          ? consignment.warehouseId
          : entry.qualityStatus === "damaged"
            ? damagedWarehouse.id
            : wasteWarehouse.id;

      await tx.inventoryMovement.create({
        data: {
          materialId: entry.materialId,
          retailerId: customerId,
          direction: "out",
          quantity: entry.quantity,
          uomId: consignmentItem.material.baseUomId,
          source,
          sourceReferenceId: consignmentReturn.id,
          createdBy: actorId,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          materialId: entry.materialId,
          warehouseId: destinationWarehouseId,
          direction: "in",
          quantity: entry.quantity,
          uomId: consignmentItem.material.baseUomId,
          source,
          sourceReferenceId: consignmentReturn.id,
          createdBy: actorId,
        },
      });

      await tx.consignmentItem.update({
        where: { id: entry.consignmentItemId },
        data: { quantityReturned: { increment: entry.quantity } },
      });

      returnedValue = returnedValue.add(consignmentItem.unitPrice.mul(entry.quantity));
    }

    if (returnedValue.gt(0)) {
      await appendLedgerEntry(tx, {
        customerId,
        transactionType: "return",
        referenceId: consignmentReturn.id,
        description: `Return against ${consignment.consignmentNumber}`,
        credit: returnedValue,
      });
    }

    await recomputeConsignmentStatus(tx, consignmentId);

    return tx.consignmentReturn.findUniqueOrThrow({
      where: { id: consignmentReturn.id },
      include: { items: { include: { material: true } } },
    });
  });
}
