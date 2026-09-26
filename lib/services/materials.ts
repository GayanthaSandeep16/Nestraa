import { prisma } from "@/lib/db/prisma";
import type { MaterialType } from "@/lib/generated/prisma/client";

export function listMaterials(opts?: { skip?: number; take?: number }) {
  return prisma.material.findMany({
    where: { deletedAt: null },
    include: { baseUom: true, category: true },
    orderBy: { name: "asc" },
    ...opts,
  });
}

export function countMaterials() {
  return prisma.material.count({ where: { deletedAt: null } });
}

export function getMaterial(id: string) {
  return prisma.material.findFirst({
    where: { id, deletedAt: null },
    include: { baseUom: true, category: true },
  });
}

export interface MaterialInput {
  name: string;
  materialType: MaterialType;
  categoryId?: string | null;
  baseUomId: string;
  reorderLevel?: number;
  reorderQty?: number;
  shelfLifeDays?: number | null;
}

const skuTypePrefixes: Record<MaterialType, string> = {
  raw: "RAW",
  processed: "PRO",
  finished_good: "FG",
};

export async function generateSku(materialType: MaterialType, name: string) {
  const letters = (name.match(/[A-Za-z]/g) ?? [])
    .slice(0, 3)
    .join("")
    .toUpperCase()
    .padEnd(3, "X");
  const prefix = `${skuTypePrefixes[materialType]}-${letters}-`;

  const existing = await prisma.material.findMany({
    where: { sku: { startsWith: prefix } },
    select: { sku: true },
  });
  const maxSeq = existing.reduce((max, m) => {
    const n = parseInt(m.sku.slice(prefix.length), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function createMaterial(data: MaterialInput) {
  const sku = await generateSku(data.materialType, data.name);
  return prisma.material.create({ data: { ...data, sku } });
}

export function updateMaterial(id: string, data: Partial<MaterialInput> & { isActive?: boolean }) {
  return prisma.material.update({ where: { id }, data });
}

export function softDeleteMaterial(id: string) {
  return prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
}
