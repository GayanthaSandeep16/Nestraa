import { prisma } from "@/lib/db/prisma";

const include = {
  customer: true,
  items: { include: { material: true } },
} as const;

export function listSalesOrders() {
  return prisma.salesOrder.findMany({ include, orderBy: { createdAt: "desc" } });
}

export function getSalesOrder(id: string) {
  return prisma.salesOrder.findUnique({ where: { id }, include });
}

export interface SalesOrderItemInput {
  materialId: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
}

export interface SalesOrderInput {
  customerId: string;
  items: SalesOrderItemInput[];
  createdBy?: string | null;
}

function generateOrderNo() {
  return `SO-${Date.now()}`;
}

export async function createSalesOrder(data: SalesOrderInput) {
  const order = await prisma.salesOrder.create({
    data: {
      orderNo: generateOrderNo(),
      customerId: data.customerId,
      createdBy: data.createdBy,
      status: "draft",
      items: { create: data.items },
    },
  });

  return prisma.salesOrder.findUniqueOrThrow({ where: { id: order.id }, include });
}

export function updateSalesOrderStatus(id: string, status: "completed" | "cancelled") {
  return prisma.salesOrder.update({ where: { id }, data: { status }, include });
}
