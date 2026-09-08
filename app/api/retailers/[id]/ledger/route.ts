import { NextResponse, type NextRequest } from "next/server";
import { getRetailer } from "@/lib/services/retailers";
import { getLedger, getOutstandingBalance } from "@/lib/services/retailer-ledger";
import { withModuleAccess } from "@/lib/auth/guard";

// [id] is the RetailerProfile id (matches the other /api/retailers/[id]
// routes) — the ledger itself is keyed by the underlying Customer id.
async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/retailers/[id]/ledger">) {
  const { id } = await ctx.params;
  const retailer = await getRetailer(id);
  if (!retailer) {
    return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
  }

  const [entries, outstandingBalance] = await Promise.all([
    getLedger(retailer.customerId),
    getOutstandingBalance(retailer.customerId),
  ]);
  return NextResponse.json({ entries, outstandingBalance });
}

export const GET = withModuleAccess("consignment", handleGET);
