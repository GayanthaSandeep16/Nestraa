import { prisma } from "@/lib/db/prisma";

const include = { customer: true, material: true } as const;

export function listCustomerPricing(opts?: { skip?: number; take?: number }) {
  return prisma.customerPricing.findMany({
    include,
    orderBy: [{ customerId: "asc" }, { effectiveFrom: "desc" }],
    ...opts,
  });
}

export function countCustomerPricing() {
  return prisma.customerPricing.count();
}

// The price in force for a customer+material on a date: the row whose window
// contains the date, most recent effectiveFrom wins. Returns null if none.
export async function getEffectivePrice(customerId: string, materialId: string, onDate?: string) {
  const date = onDate ? new Date(onDate) : new Date();
  const row = await prisma.customerPricing.findFirst({
    where: {
      customerId,
      materialId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return row?.unitPrice ?? null;
}

export interface CustomerPricingInput {
  customerId: string;
  materialId: string;
  unitPrice: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export function createCustomerPricing(data: CustomerPricingInput) {
  return prisma.customerPricing.create({
    data: {
      customerId: data.customerId,
      materialId: data.materialId,
      unitPrice: data.unitPrice,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
    },
    include,
  });
}

export function endCustomerPricing(id: string, effectiveTo: string) {
  return prisma.customerPricing.update({
    where: { id },
    data: { effectiveTo: new Date(effectiveTo) },
    include,
  });
}
