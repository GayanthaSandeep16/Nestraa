import { prisma } from "@/lib/db/prisma";

export function listProducts() {
  return prisma.material.findMany({
    where: { materialType: "finished_good", deletedAt: null },
    include: { baseUom: true, category: true },
    orderBy: { name: "asc" },
  });
}

export function getProduct(id: string) {
  return prisma.material.findFirst({
    where: { id, materialType: "finished_good", deletedAt: null },
    include: { baseUom: true, category: true },
  });
}

export interface ProductInput {
  sku: string;
  name: string;
  categoryId?: string | null;
  baseUomId: string;
  reorderLevel?: number;
  reorderQty?: number;
  shelfLifeDays?: number | null;
}

export function createProduct(data: ProductInput) {
  return prisma.material.create({ data: { ...data, materialType: "finished_good" } });
}

export function updateProduct(id: string, data: Partial<ProductInput> & { isActive?: boolean }) {
  return prisma.material.update({ where: { id }, data });
}

export function softDeleteProduct(id: string) {
  return prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
}
