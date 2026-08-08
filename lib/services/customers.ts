import { prisma } from "@/lib/db/prisma";
import type { CustomerType } from "@/lib/generated/prisma/client";

export function listCustomers() {
  return prisma.customer.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export function getCustomer(id: string) {
  return prisma.customer.findFirst({ where: { id, deletedAt: null } });
}

export interface CustomerInput {
  name: string;
  customerType: CustomerType;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit?: number;
  paymentTerms?: string | null;
}

export function createCustomer(data: CustomerInput) {
  return prisma.customer.create({ data });
}

export function updateCustomer(id: string, data: Partial<CustomerInput> & { isActive?: boolean }) {
  return prisma.customer.update({ where: { id }, data });
}

export function softDeleteCustomer(id: string) {
  return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
}
