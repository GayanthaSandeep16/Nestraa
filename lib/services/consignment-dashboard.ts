import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

interface LatestBalanceRow {
  customer_id: string;
  running_balance: Prisma.Decimal;
}

// Retailer's outstanding balance is always the latest cached runningBalance
// per customer — never summed client-side. One raw query gets "latest row
// per customer_id" cheaply (mirrors the reporting-view pattern used for
// v_current_stock elsewhere).
function getLatestBalancePerRetailer() {
  return prisma.$queryRaw<LatestBalanceRow[]>`
    SELECT DISTINCT ON (customer_id) customer_id, running_balance
    FROM retailer_ledger
    ORDER BY customer_id, created_at DESC
  `;
}

async function getOverdueRetailerCount(latestBalances: LatestBalanceRow[]) {
  // Heuristic (no due-date/payment-terms enforcement modeled yet): a
  // retailer counts as overdue if they have an outstanding balance and no
  // payment recorded in the last 30 days.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const withBalance = latestBalances.filter((r) => r.running_balance.gt(0));
  if (withBalance.length === 0) return 0;

  const recentPayments = await prisma.payment.findMany({
    where: { customerId: { in: withBalance.map((r) => r.customer_id) }, createdAt: { gte: cutoff } },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const recentlyPaidIds = new Set(recentPayments.map((p) => p.customerId));

  return withBalance.filter((r) => !recentlyPaidIds.has(r.customer_id)).length;
}

export async function getConsignmentDashboardMetrics() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const [statusCounts, heldItems, paidToday, paidThisMonth, latestBalances, returnItems] = await Promise.all([
    prisma.consignment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.consignmentItem.findMany({
      where: { consignment: { status: { in: ["delivered", "partially_settled"] } } },
      select: { quantityDelivered: true, quantitySold: true, quantityReturned: true, unitPrice: true },
    }),
    prisma.payment.aggregate({ where: { createdAt: { gte: startOfToday } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    getLatestBalancePerRetailer(),
    prisma.consignmentReturnItem.findMany({
      select: { quantity: true, qualityStatus: true, consignmentItem: { select: { unitPrice: true } } },
    }),
  ]);

  const totalOutstanding = latestBalances.reduce((sum, row) => sum.add(row.running_balance), new Prisma.Decimal(0));
  const overdueRetailerCount = await getOverdueRetailerCount(latestBalances);

  const retailerHeldStockValue = heldItems.reduce((sum, item) => {
    const remaining = item.quantityDelivered.sub(item.quantitySold).sub(item.quantityReturned);
    return sum.add(remaining.mul(item.unitPrice));
  }, new Prisma.Decimal(0));

  const countByStatus = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all]));

  const returnsByQuality = { good: new Prisma.Decimal(0), damaged: new Prisma.Decimal(0), expired: new Prisma.Decimal(0) };
  const wasteValue = { damaged: new Prisma.Decimal(0), expired: new Prisma.Decimal(0) };
  for (const item of returnItems) {
    returnsByQuality[item.qualityStatus] = returnsByQuality[item.qualityStatus].add(item.quantity);
    if (item.qualityStatus === "damaged" || item.qualityStatus === "expired") {
      wasteValue[item.qualityStatus] = wasteValue[item.qualityStatus].add(item.quantity.mul(item.consignmentItem.unitPrice));
    }
  }

  return {
    collections: {
      outstandingBalance: totalOutstanding,
      collectedToday: paidToday._sum.amount ?? new Prisma.Decimal(0),
      collectedThisMonth: paidThisMonth._sum.amount ?? new Prisma.Decimal(0),
      overdueRetailers: overdueRetailerCount,
    },
    consignment: {
      activeConsignments: (countByStatus.delivered ?? 0) + (countByStatus.partially_settled ?? 0),
      partiallySettled: countByStatus.partially_settled ?? 0,
      fullySettled: countByStatus.fully_settled ?? 0,
      retailerHeldStockValue,
    },
    returns: {
      goodReturnQty: returnsByQuality.good,
      damagedReturnQty: returnsByQuality.damaged,
      expiredReturnQty: returnsByQuality.expired,
      wasteValue: wasteValue.damaged.add(wasteValue.expired),
    },
  };
}
