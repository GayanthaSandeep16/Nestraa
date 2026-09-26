import { prisma } from "@/lib/db/prisma";

const include = { material: true } as const;

export function listProductCosts(opts?: { skip?: number; take?: number }) {
  return prisma.productCost.findMany({
    include,
    orderBy: { effectiveFrom: "desc" },
    ...opts,
  });
}

export function countProductCosts() {
  return prisma.productCost.count();
}

// The cost/price in force for a material on a date: the row whose window
// contains the date, most recent effectiveFrom wins. Returns null if none.
export async function getEffectiveCost(materialId: string, onDate?: string) {
  const date = onDate ? new Date(onDate) : new Date();
  const row = await prisma.productCost.findFirst({
    where: {
      materialId,
      effectiveFrom: { lte: date },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  return row ? { unitCost: row.unitCost, unitPrice: row.unitPrice } : null;
}

export interface ProductCostInput {
  materialId: string;
  unitCost: number;
  unitPrice: number;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export function createProductCost(data: ProductCostInput) {
  return prisma.productCost.create({
    data: {
      materialId: data.materialId,
      unitCost: data.unitCost,
      unitPrice: data.unitPrice,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : undefined,
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
    },
    include,
  });
}

export function endProductCost(id: string, effectiveTo: string) {
  return prisma.productCost.update({
    where: { id },
    data: { effectiveTo: new Date(effectiveTo) },
    include,
  });
}
