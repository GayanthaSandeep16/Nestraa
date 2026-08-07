import { prisma } from "@/lib/db/prisma";
import type { QcResult } from "@/lib/generated/prisma/client";

const include = {
  recipe: { include: { outputMaterial: true, ingredients: { include: { material: true, uom: true } } } },
  batchDetails: { include: { batch: { include: { material: true, uom: true, warehouse: true } } } },
} as const;

export function listBlendOrders() {
  return prisma.blendOrder.findMany({ include, orderBy: { createdAt: "desc" } });
}

export function getBlendOrder(id: string) {
  return prisma.blendOrder.findUnique({ where: { id }, include });
}

export interface BlendOrderInput {
  recipeId: string;
  plannedQuantity: number;
  createdBy?: string | null;
}

function generateOrderNo() {
  return `BLD-${Date.now()}`;
}

export async function createBlendOrder(data: BlendOrderInput) {
  const order = await prisma.blendOrder.create({
    data: {
      orderNo: generateOrderNo(),
      recipeId: data.recipeId,
      plannedQuantity: data.plannedQuantity,
      createdBy: data.createdBy,
      status: "draft",
    },
  });

  return prisma.blendOrder.findUniqueOrThrow({ where: { id: order.id }, include });
}

export function cancelBlendOrder(id: string) {
  return prisma.blendOrder.update({ where: { id, status: "draft" }, data: { status: "cancelled" } });
}

export interface BlendOrderInputBatch {
  materialId: string;
  batchId: string;
  quantity: number;
  uomId: string;
}

export interface BlendOrderCompletionInput {
  inputs: BlendOrderInputBatch[];
  output: {
    quantity: number;
    uomId: string;
    warehouseId: string;
    unitCost?: number | null;
    manufactureDate?: Date | null;
    expiryDate?: Date | null;
    qcResult?: QcResult | null;
  };
  completedBy?: string | null;
}

export function completeBlendOrder(id: string, data: BlendOrderCompletionInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.blendOrder.findUniqueOrThrow({ where: { id }, include: { recipe: true } });

    const outputBatch = await tx.batch.create({
      data: {
        batchNo: `${order.orderNo}-OUT`,
        batchType: "blend",
        materialId: order.recipe.outputMaterialId,
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

    await tx.blendBatchDetail.create({
      data: {
        batchId: outputBatch.id,
        blendOrderId: order.id,
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
          source: "blend",
          sourceReferenceId: order.id,
          createdBy: data.completedBy,
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        materialId: order.recipe.outputMaterialId,
        batchId: outputBatch.id,
        warehouseId: data.output.warehouseId,
        direction: "in",
        quantity: data.output.quantity,
        uomId: data.output.uomId,
        source: "blend",
        sourceReferenceId: order.id,
        unitCost: data.output.unitCost,
        createdBy: data.completedBy,
      },
    });

    await tx.blendOrder.update({ where: { id: order.id }, data: { status: "completed" } });

    return tx.blendOrder.findUniqueOrThrow({ where: { id: order.id }, include });
  });
}
