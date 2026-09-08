import { prisma } from "@/lib/db/prisma";
import type { GrnProcessingPath, QcResult } from "@/lib/generated/prisma/client";

export function listGrns(opts?: { skip?: number; take?: number }) {
  return prisma.goodsReceivedNote.findMany({
    include: {
      po: true,
      supplier: true,
      warehouse: true,
      items: { include: { material: true, uom: true, batch: true } },
    },
    orderBy: { receivedAt: "desc" },
    ...opts,
  });
}

export function countGrns() {
  return prisma.goodsReceivedNote.count();
}

export function getGrn(id: string) {
  return prisma.goodsReceivedNote.findUnique({
    where: { id },
    include: {
      po: true,
      supplier: true,
      warehouse: true,
      items: { include: { material: true, uom: true, batch: true } },
    },
  });
}

export interface GrnItemInput {
  poItemId?: string | null;
  materialId: string;
  quantity: number;
  unitCost: number;
  uomId: string;
  qcResult?: QcResult | null;
  qcNotes?: string | null;
  processingPath?: GrnProcessingPath | null;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
}

export interface GrnInput {
  poId?: string | null;
  supplierId: string;
  warehouseId: string;
  notes?: string | null;
  receivedBy?: string | null;
  items: GrnItemInput[];
}

function generateGrnNo() {
  return `GRN-${Date.now()}`;
}

export function createGrn(data: GrnInput) {
  const { items, receivedBy, ...header } = data;

  return prisma.$transaction(async (tx) => {
    const grnNo = generateGrnNo();
    const grn = await tx.goodsReceivedNote.create({
      data: { ...header, grnNo, receivedBy },
    });

    for (const [index, item] of items.entries()) {
      const { manufactureDate, expiryDate, poItemId, ...itemFields } = item;

      const batch = await tx.batch.create({
        data: {
          batchNo: `${grnNo}-${index + 1}`,
          batchType: "grn",
          materialId: itemFields.materialId,
          warehouseId: header.warehouseId,
          quantity: itemFields.quantity,
          uomId: itemFields.uomId,
          unitCost: itemFields.unitCost,
          manufactureDate,
          expiryDate,
          qcResult: itemFields.qcResult,
          createdBy: receivedBy,
        },
      });

      await tx.grnItem.create({
        data: {
          grnId: grn.id,
          poItemId,
          materialId: itemFields.materialId,
          quantity: itemFields.quantity,
          unitCost: itemFields.unitCost,
          uomId: itemFields.uomId,
          qcResult: itemFields.qcResult,
          qcNotes: itemFields.qcNotes,
          processingPath: itemFields.processingPath,
          batchId: batch.id,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          materialId: itemFields.materialId,
          batchId: batch.id,
          warehouseId: header.warehouseId,
          direction: "in",
          quantity: itemFields.quantity,
          uomId: itemFields.uomId,
          source: "grn",
          sourceReferenceId: grn.id,
          unitCost: itemFields.unitCost,
          createdBy: receivedBy,
        },
      });

      if (poItemId) {
        await tx.purchaseOrderItem.update({
          where: { id: poItemId },
          data: { qtyReceived: { increment: itemFields.quantity } },
        });
      }
    }

    if (header.poId) {
      const poItems = await tx.purchaseOrderItem.findMany({ where: { poId: header.poId } });
      const allReceived = poItems.every((poItem) => poItem.qtyReceived.gte(poItem.quantity));
      const anyReceived = poItems.some((poItem) => poItem.qtyReceived.gt(0));
      await tx.purchaseOrder.update({
        where: { id: header.poId },
        data: { status: allReceived ? "received" : anyReceived ? "partially_received" : "sent" },
      });
    }

    return tx.goodsReceivedNote.findUniqueOrThrow({
      where: { id: grn.id },
      include: {
        po: true,
        supplier: true,
        warehouse: true,
        items: { include: { material: true, uom: true, batch: true } },
      },
    });
  });
}
