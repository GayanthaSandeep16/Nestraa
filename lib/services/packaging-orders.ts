import { prisma } from "@/lib/db/prisma";
import type { QcResult } from "@/lib/generated/prisma/client";

const include = {
  processedMaterial: true,
  finishedProduct: true,
  packageSize: { include: { uom: true } },
  batchDetails: { include: { batch: { include: { material: true, uom: true, warehouse: true } } } },
} as const;

export function listPackagingOrders(opts?: { skip?: number; take?: number }) {
  return prisma.packagingOrder.findMany({ include, orderBy: { createdAt: "desc" }, ...opts });
}

export function countPackagingOrders() {
  return prisma.packagingOrder.count();
}

export function getPackagingOrder(id: string) {
  return prisma.packagingOrder.findUnique({ where: { id }, include });
}

export interface PackagingOrderInput {
  processedMaterialId: string;
  finishedProductId: string;
  packageSizeId: string;
  plannedQuantity: number;
  createdBy?: string | null;
}

function generateOrderNo() {
  return `PKG-${Date.now()}`;
}

export async function createPackagingOrder(data: PackagingOrderInput) {
  const order = await prisma.packagingOrder.create({
    data: {
      orderNo: generateOrderNo(),
      processedMaterialId: data.processedMaterialId,
      finishedProductId: data.finishedProductId,
      packageSizeId: data.packageSizeId,
      plannedQuantity: data.plannedQuantity,
      createdBy: data.createdBy,
      status: "draft",
    },
  });

  return prisma.packagingOrder.findUniqueOrThrow({ where: { id: order.id }, include });
}

export function cancelPackagingOrder(id: string) {
  return prisma.packagingOrder.update({ where: { id }, data: { status: "cancelled" } });
}

export interface PackagingOrderInputBatch {
  batchId: string;
  quantity: number;
  uomId: string;
}

export interface PackagingOrderCompletionInput {
  inputs: PackagingOrderInputBatch[];
  output: {
    quantity: number;
    uomId: string;
    warehouseId: string;
    unitCost?: number | null;
    manufactureDate?: Date | null;
    expiryDate?: Date | null;
    qcResult?: QcResult | null;
  };
  barcode?: string | null;
  completedBy?: string | null;
}

export function completePackagingOrder(id: string, data: PackagingOrderCompletionInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.packagingOrder.findUniqueOrThrow({ where: { id } });

    const outputBatch = await tx.batch.create({
      data: {
        batchNo: `${order.orderNo}-OUT`,
        batchType: "packaging",
        materialId: order.finishedProductId,
        warehouseId: data.output.warehouseId,
        quantity: data.output.quantity,
        uomId: data.output.uomId,
        unitCost: data.output.unitCost,
        manufactureDate: data.output.manufactureDate,
        expiryDate: data.output.expiryDate,
        qcResult: data.output.qcResult,
        createdBy: data.completedBy,
      },
    });

    await tx.packagingBatchDetail.create({
      data: {
        batchId: outputBatch.id,
        packagingOrderId: order.id,
        barcode: data.barcode,
        manufactureDate: data.output.manufactureDate,
        expiryDate: data.output.expiryDate,
      },
    });

    for (const input of data.inputs) {
      const inputBatch = await tx.batch.findUniqueOrThrow({ where: { id: input.batchId } });

      await tx.batchInput.create({
        data: {
          outputBatchId: outputBatch.id,
          inputBatchId: input.batchId,
          quantityConsumed: input.quantity,
          uomId: input.uomId,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          materialId: inputBatch.materialId,
          batchId: input.batchId,
          warehouseId: inputBatch.warehouseId,
          direction: "out",
          quantity: input.quantity,
          uomId: input.uomId,
          source: "packaging",
          sourceReferenceId: order.id,
          createdBy: data.completedBy,
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        materialId: order.finishedProductId,
        batchId: outputBatch.id,
        warehouseId: data.output.warehouseId,
        direction: "in",
        quantity: data.output.quantity,
        uomId: data.output.uomId,
        source: "packaging",
        sourceReferenceId: order.id,
        unitCost: data.output.unitCost,
        createdBy: data.completedBy,
      },
    });

    await tx.packagingOrder.update({ where: { id: order.id }, data: { status: "completed" } });

    return tx.packagingOrder.findUniqueOrThrow({ where: { id: order.id }, include });
  });
}
