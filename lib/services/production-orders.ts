import { prisma } from "@/lib/db/prisma";
import type { QcResult } from "@/lib/generated/prisma/client";

const include = {
  process: { include: { inputMaterial: true, outputMaterial: true } },
  outputMaterial: true,
  batchDetails: { include: { batch: { include: { material: true, uom: true, warehouse: true } } } },
} as const;

export function listProductionOrders() {
  return prisma.productionOrder.findMany({ include, orderBy: { createdAt: "desc" } });
}

export function getProductionOrder(id: string) {
  return prisma.productionOrder.findUnique({ where: { id }, include });
}

export interface ProductionOrderInput {
  processId: string;
  plannedQuantity: number;
  plannedStartDate?: Date | null;
  createdBy?: string | null;
}

function generateOrderNo() {
  return `PRO-${Date.now()}`;
}

export async function createProductionOrder(data: ProductionOrderInput) {
  const process = await prisma.productionProcessDefinition.findUniqueOrThrow({ where: { id: data.processId } });
  if (!process.outputMaterialId) {
    throw new Error("Selected process has no output material defined");
  }

  const order = await prisma.productionOrder.create({
    data: {
      orderNo: generateOrderNo(),
      processId: data.processId,
      outputMaterialId: process.outputMaterialId,
      plannedQuantity: data.plannedQuantity,
      plannedStartDate: data.plannedStartDate,
      createdBy: data.createdBy,
      status: "draft",
    },
  });

  return prisma.productionOrder.findUniqueOrThrow({ where: { id: order.id }, include });
}

export function cancelProductionOrder(id: string) {
  return prisma.productionOrder.update({ where: { id }, data: { status: "cancelled" } });
}

export interface ProductionOrderInputBatch {
  batchId: string;
  quantity: number;
  uomId: string;
}

export interface ProductionOrderCompletionInput {
  inputs: ProductionOrderInputBatch[];
  output: {
    quantity: number;
    uomId: string;
    warehouseId: string;
    unitCost?: number | null;
    manufactureDate?: Date | null;
    expiryDate?: Date | null;
    qcResult?: QcResult | null;
  };
  waste?: {
    quantity?: number | null;
    uomId?: string | null;
    reason?: string | null;
  } | null;
  completedBy?: string | null;
}

export function completeProductionOrder(id: string, data: ProductionOrderCompletionInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUniqueOrThrow({ where: { id }, include: { process: true } });

    const outputBatch = await tx.batch.create({
      data: {
        batchNo: `${order.orderNo}-OUT`,
        batchType: "production",
        materialId: order.outputMaterialId,
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

    await tx.productionBatchDetail.create({
      data: {
        batchId: outputBatch.id,
        productionOrderId: order.id,
        wasteQuantity: data.waste?.quantity ?? 0,
        wasteUomId: data.waste?.uomId,
        wasteReason: data.waste?.reason,
        expectedYieldPct: order.process?.expectedYieldPct,
        actualYieldPct: order.plannedQuantity.gt(0) ? (data.output.quantity / Number(order.plannedQuantity)) * 100 : null,
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
          source: "production",
          sourceReferenceId: order.id,
          createdBy: data.completedBy,
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        materialId: order.outputMaterialId,
        batchId: outputBatch.id,
        warehouseId: data.output.warehouseId,
        direction: "in",
        quantity: data.output.quantity,
        uomId: data.output.uomId,
        source: "production",
        sourceReferenceId: order.id,
        unitCost: data.output.unitCost,
        createdBy: data.completedBy,
      },
    });

    await tx.productionOrder.update({ where: { id: order.id }, data: { status: "completed" } });

    return tx.productionOrder.findUniqueOrThrow({ where: { id: order.id }, include });
  });
}
