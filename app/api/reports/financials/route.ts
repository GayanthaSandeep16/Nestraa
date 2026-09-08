import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { withModuleAccess } from "@/lib/auth/guard";

// One-row raw query: sum of each customer's latest cached runningBalance —
// never sum every ledger row (mirrors getOutstandingBalance). No
// retailer_profiles join, so plain sales-invoice AR is included too.
async function getTotalOwedToUs() {
  const rows = await prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(t.running_balance), 0) AS total
    FROM (
      SELECT DISTINCT ON (customer_id) running_balance
      FROM retailer_ledger
      ORDER BY customer_id, created_at DESC
    ) t
  `;
  return rows[0]?.total ?? new Prisma.Decimal(0);
}

// Same shape on the AP side: sum of each supplier's latest cached balance.
async function getTotalWeOweSuppliers() {
  const rows = await prisma.$queryRaw<{ total: Prisma.Decimal }[]>`
    SELECT COALESCE(SUM(t.running_balance), 0) AS total
    FROM (
      SELECT DISTINCT ON (supplier_id) running_balance
      FROM supplier_ledger
      ORDER BY supplier_id, created_at DESC
    ) t
  `;
  return rows[0]?.total ?? new Prisma.Decimal(0);
}

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const startOfMonth = new Date();
  startOfMonth.setHours(0, 0, 0, 0);
  startOfMonth.setDate(1);

  const rangeWhere =
    from && to ? { invoiceDate: { gte: new Date(from), lte: new Date(to) } } : null;

  const [totalSales, salesThisMonth, salesInRange, owedToUs, weOwe, collected, collectedThisMonth] =
    await Promise.all([
      prisma.salesInvoice.aggregate({ _sum: { totalAmount: true } }),
      prisma.salesInvoice.aggregate({
        _sum: { totalAmount: true },
        where: { invoiceDate: { gte: startOfMonth } },
      }),
      rangeWhere
        ? prisma.salesInvoice.aggregate({ _sum: { totalAmount: true }, where: rangeWhere })
        : Promise.resolve(null),
      getTotalOwedToUs(),
      getTotalWeOweSuppliers(),
      prisma.payment.aggregate({ _sum: { amount: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startOfMonth } } }),
    ]);

  const str = (v: Prisma.Decimal | null | undefined) => (v ?? new Prisma.Decimal(0)).toString();

  return NextResponse.json({
    totalSales: str(totalSales._sum.totalAmount),
    salesThisMonth: str(salesThisMonth._sum.totalAmount),
    salesInRange: salesInRange ? str(salesInRange._sum.totalAmount) : null,
    owedToUs: str(owedToUs),
    weOweSuppliers: str(weOwe),
    collected: str(collected._sum.amount),
    collectedThisMonth: str(collectedThisMonth._sum.amount),
  });
}

export const GET = withModuleAccess("reports", handleGET);
