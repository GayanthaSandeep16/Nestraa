import { prisma } from "@/lib/db/prisma";
import type { PoStatus } from "@/lib/generated/prisma/client";

export function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    include: { supplier: true, items: { include: { material: true, uom: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getPurchaseOrder(id: string) {
  return prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { material: true, uom: true } } },
  });
}

export interface PurchaseOrderItemInput {
  materialId: string;
  quantity: number;
  unitPrice: number;
  uomId: string;
}

export interface PurchaseOrderInput {
  supplierId: string;
  expectedDate?: Date | null;
  items: PurchaseOrderItemInput[];
  createdBy?: string | null;
}

function generatePoNo() {
  return `PO-${Date.now()}`;
}

export function createPurchaseOrder(data: PurchaseOrderInput) {
  const { items, ...header } = data;
  return prisma.purchaseOrder.create({
    data: {
      ...header,
      poNo: generatePoNo(),
      items: { create: items },
    },
    include: { supplier: true, items: { include: { material: true, uom: true } } },
  });
}

export function updatePurchaseOrderStatus(id: string, status: PoStatus, approverId?: string | null) {
  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      status,
      ...(status === "sent" && approverId ? { approvedBy: approverId, approvedAt: new Date() } : {}),
    },
    include: { supplier: true, items: { include: { material: true, uom: true } } },
  });
}
