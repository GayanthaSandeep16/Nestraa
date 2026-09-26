import { prisma } from "@/lib/db/prisma";
import { generateSku } from "@/lib/services/materials";

const productWhere = { materialType: "finished_good", deletedAt: null } as const;

export function listProducts(opts?: { skip?: number; take?: number }) {
  return prisma.material.findMany({
    where: productWhere,
    include: { baseUom: true, category: true },
    orderBy: { name: "asc" },
    ...opts,
  });
}

export function countProducts() {
  return prisma.material.count({ where: productWhere });
}

export function getProduct(id: string) {
  return prisma.material.findFirst({
    where: { id, materialType: "finished_good", deletedAt: null },
    include: { baseUom: true, category: true },
  });
}

export interface ProductInput {
  name: string;
  categoryId?: string | null;
  baseUomId: string;
  reorderLevel?: number;
  reorderQty?: number;
  shelfLifeDays?: number | null;
}

export async function createProduct(data: ProductInput) {
  const sku = await generateSku("finished_good", data.name);
  return prisma.material.create({ data: { ...data, sku, materialType: "finished_good" } });
}

export function updateProduct(id: string, data: Partial<ProductInput> & { isActive?: boolean }) {
  return prisma.material.update({ where: { id }, data });
}

export function softDeleteProduct(id: string) {
  return prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
}
