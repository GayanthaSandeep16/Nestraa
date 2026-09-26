import { NextResponse, type NextRequest } from "next/server";
import { getRetailer } from "@/lib/services/retailers";
import { countLedger, getLedger, getOutstandingBalance } from "@/lib/services/retailer-ledger";
import { pageArgs, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

// [id] is the RetailerProfile id (matches the other /api/retailers/[id]
// routes) — the ledger itself is keyed by the underlying Customer id.
async function handleGET(request: NextRequest, ctx: RouteContext<"/api/retailers/[id]/ledger">) {
  const { id } = await ctx.params;
  const retailer = await getRetailer(id);
  if (!retailer) {
    return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
  }

  const page = parsePage(request);
  const [entries, outstandingBalance, total] = await Promise.all([
    getLedger(retailer.customerId, page ? pageArgs(page) : undefined),
    getOutstandingBalance(retailer.customerId),
    page ? countLedger(retailer.customerId) : Promise.resolve(0),
  ]);
  return NextResponse.json({
    entries,
    outstandingBalance,
    ...(page ? { pageCount: Math.max(1, Math.ceil(total / page.pageSize)), page: page.page } : {}),
  });
}

export const GET = withModuleAccess("consignment", handleGET);
