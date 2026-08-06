import { prisma } from "@/lib/db/prisma";

export function listUnitsOfMeasure() {
  return prisma.unitOfMeasure.findMany({ orderBy: { code: "asc" } });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}
