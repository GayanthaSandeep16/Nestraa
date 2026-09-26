import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

const include = { customer: true, assignedSalesRep: true } as const;

// Latest cached runningBalance per customer, never summed client-side —
// same "one row per customer" pattern as the consignment dashboard.
async function attachOutstandingBalances<T extends { customerId: string }>(retailers: T[]) {
  if (retailers.length === 0) return retailers.map((r) => ({ ...r, outstandingBalance: new Prisma.Decimal(0) }));

  const balances = await prisma.$queryRaw<{ customer_id: string; running_balance: Prisma.Decimal }[]>`
    SELECT DISTINCT ON (customer_id) customer_id, running_balance
    FROM retailer_ledger
    WHERE customer_id IN (${Prisma.join(retailers.map((r) => r.customerId))})
    ORDER BY customer_id, created_at DESC
  `;
  const balanceByCustomer = new Map(balances.map((b) => [b.customer_id, b.running_balance]));

  return retailers.map((r) => ({ ...r, outstandingBalance: balanceByCustomer.get(r.customerId) ?? new Prisma.Decimal(0) }));
}

export async function listRetailers(opts?: { skip?: number; take?: number }) {
  const retailers = await prisma.retailerProfile.findMany({
    where: { customer: { deletedAt: null } },
    include,
    orderBy: { createdAt: "desc" },
    ...opts,
  });
  return attachOutstandingBalances(retailers);
}

export function countRetailers() {
  return prisma.retailerProfile.count({ where: { customer: { deletedAt: null } } });
}

export function getRetailer(id: string) {
  return prisma.retailerProfile.findFirst({
    where: { id, customer: { deletedAt: null } },
    include,
  });
}

export interface RetailerInput {
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit?: number;
  paymentTerms?: string | null;
  retailerCode?: string | null;
  assignedSalesRepId?: string | null;
  route?: string | null;
}

function generateRetailerCode() {
  return `RET-${Date.now()}`;
}

export function createRetailer(data: RetailerInput) {
  const { retailerCode, assignedSalesRepId, route, ...customerFields } = data;

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: { ...customerFields, customerType: "retail" },
    });

    return tx.retailerProfile.create({
      data: {
        customerId: customer.id,
        retailerCode: retailerCode || generateRetailerCode(),
        assignedSalesRepId,
        route,
      },
      include,
    });
  });
}

export function updateRetailer(id: string, data: Partial<RetailerInput> & { isActive?: boolean }) {
  const { retailerCode, assignedSalesRepId, route, isActive, ...customerFields } = data;

  return prisma.$transaction(async (tx) => {
    const profile = await tx.retailerProfile.findUniqueOrThrow({ where: { id } });

    if (Object.keys(customerFields).length > 0 || isActive !== undefined) {
      await tx.customer.update({
        where: { id: profile.customerId },
        data: { ...customerFields, isActive },
      });
    }

    return tx.retailerProfile.update({
      where: { id },
      data: { retailerCode: retailerCode || undefined, assignedSalesRepId, route },
      include,
    });
  });
}

export function softDeleteRetailer(id: string) {
  return prisma.$transaction(async (tx) => {
    const profile = await tx.retailerProfile.findUniqueOrThrow({ where: { id } });
    return tx.customer.update({ where: { id: profile.customerId }, data: { deletedAt: new Date() } });
  });
}
