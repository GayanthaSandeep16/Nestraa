import { prisma } from "@/lib/db/prisma";

export function listSuppliers() {
  return prisma.supplier.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export function getSupplier(id: string) {
  return prisma.supplier.findFirst({ where: { id, deletedAt: null } });
}

export interface SupplierInput {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTerms?: string | null;
}

export function createSupplier(data: SupplierInput) {
  return prisma.supplier.create({ data });
}

export function updateSupplier(id: string, data: Partial<SupplierInput> & { isActive?: boolean }) {
  return prisma.supplier.update({ where: { id }, data });
}

export function softDeleteSupplier(id: string) {
  return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
}
