import { prisma } from "@/lib/db/prisma";
import type { MaterialType } from "@/lib/generated/prisma/client";

export function listMaterials() {
  return prisma.material.findMany({
    where: { deletedAt: null },
    include: { baseUom: true, category: true },
    orderBy: { name: "asc" },
  });
}

export function getMaterial(id: string) {
  return prisma.material.findFirst({
    where: { id, deletedAt: null },
    include: { baseUom: true, category: true },
  });
}

export interface MaterialInput {
  sku: string;
  name: string;
  materialType: MaterialType;
  categoryId?: string | null;
  baseUomId: string;
  reorderLevel?: number;
  reorderQty?: number;
  shelfLifeDays?: number | null;
}

export function createMaterial(data: MaterialInput) {
  return prisma.material.create({ data });
}

export function updateMaterial(id: string, data: Partial<MaterialInput> & { isActive?: boolean }) {
  return prisma.material.update({ where: { id }, data });
}

export function softDeleteMaterial(id: string) {
  return prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
}
