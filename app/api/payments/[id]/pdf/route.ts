import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@/lib/services/payments";
import { withModuleAccess } from "@/lib/auth/guard";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { logAudit } from "@/lib/services/audit";
import { ReceiptDocument, receiptNumber } from "@/lib/pdf/ReceiptDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/payments/[id]/pdf">) {
  const { id } = await ctx.params;
  const payment = await getPayment(id);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const user = await getCurrentAppUser();
  await logAudit({ tableName: "payments", recordId: id, action: "print", changedBy: user?.id });

  const plainPayment = JSON.parse(JSON.stringify(payment));

  return renderPdfResponse(ReceiptDocument({ payment: plainPayment }), `${receiptNumber(payment)}.pdf`);
}

export const GET = withModuleAccess("sales", handleGET);
