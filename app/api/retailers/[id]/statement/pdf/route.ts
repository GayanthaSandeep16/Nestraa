import { NextResponse, type NextRequest } from "next/server";
import { getRetailer } from "@/lib/services/retailers";
import { getLedger, getOutstandingBalance } from "@/lib/services/retailer-ledger";
import { withModuleAccess } from "@/lib/auth/guard";
import { StatementDocument } from "@/lib/pdf/StatementDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

// [id] is the RetailerProfile id, matching /api/retailers/[id]/ledger.
async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/retailers/[id]/statement/pdf">) {
  const { id } = await ctx.params;
  const retailer = await getRetailer(id);
  if (!retailer) {
    return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
  }

  const [entries, outstandingBalance] = await Promise.all([
    getLedger(retailer.customerId),
    getOutstandingBalance(retailer.customerId),
  ]);

  const plainEntries = JSON.parse(JSON.stringify(entries));
  const plainBalance = JSON.parse(JSON.stringify(outstandingBalance));

  return renderPdfResponse(
    StatementDocument({
      retailer: {
        name: retailer.customer.name,
        retailerCode: retailer.retailerCode,
        phone: retailer.customer.phone,
        address: retailer.customer.address,
      },
      entries: plainEntries,
      outstandingBalance: plainBalance,
    }),
    `Statement-${retailer.retailerCode}.pdf`
  );
}

export const GET = withModuleAccess("consignment", handleGET);
