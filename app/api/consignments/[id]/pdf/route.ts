import { NextResponse, type NextRequest } from "next/server";
import { getConsignment, getConsignmentFinancials } from "@/lib/services/consignments";
import { withModuleAccess } from "@/lib/auth/guard";
import { DeliveryNoteDocument } from "@/lib/pdf/DeliveryNoteDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/consignments/[id]/pdf">) {
  const { id } = await ctx.params;
  const consignment = await getConsignment(id);
  if (!consignment) {
    return NextResponse.json({ error: "Consignment not found" }, { status: 404 });
  }
  if (consignment.status === "draft") {
    return NextResponse.json({ error: "Deliver this consignment before generating its document" }, { status: 409 });
  }

  const financials = await getConsignmentFinancials(id);
  const plainConsignment = JSON.parse(JSON.stringify(consignment));
  const plainFinancials = JSON.parse(JSON.stringify(financials));

  return renderPdfResponse(
    DeliveryNoteDocument({ consignment: plainConsignment, financials: plainFinancials }),
    `${consignment.consignmentNumber}.pdf`
  );
}

export const GET = withModuleAccess("consignment", handleGET);
