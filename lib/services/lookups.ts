import { prisma } from "@/lib/db/prisma";

export function listUnitsOfMeasure() {
  return prisma.unitOfMeasure.findMany({ orderBy: { code: "asc" } });
}

export function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export function listWarehouses() {
  return prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export function listPackageSizes() {
  return prisma.packageSize.findMany({ include: { uom: true }, orderBy: { name: "asc" } });
}

export function listFinishedGoods() {
  return prisma.material.findMany({
    where: { materialType: "finished_good", deletedAt: null, isActive: true },
    include: { baseUom: true },
    orderBy: { name: "asc" },
  });
}

export function listSalesReps() {
  return prisma.appUser.findMany({
    where: { isActive: true, role: { name: "sales_rep" } },
    orderBy: { fullName: "asc" },
  });
}
