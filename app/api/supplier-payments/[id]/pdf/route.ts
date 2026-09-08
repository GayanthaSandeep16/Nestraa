import { NextResponse, type NextRequest } from "next/server";
import { getSupplierPayment } from "@/lib/services/supplier-payments";
import { withModuleAccess } from "@/lib/auth/guard";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { logAudit } from "@/lib/services/audit";
import { SupplierPaymentVoucherDocument, voucherNumber } from "@/lib/pdf/SupplierPaymentVoucherDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/supplier-payments/[id]/pdf">) {
  const { id } = await ctx.params;
  const payment = await getSupplierPayment(id);
  if (!payment) {
    return NextResponse.json({ error: "Supplier payment not found" }, { status: 404 });
  }

  const user = await getCurrentAppUser();
  await logAudit({ tableName: "supplier_payments", recordId: id, action: "print", changedBy: user?.id });

  const plainPayment = JSON.parse(JSON.stringify(payment));

  return renderPdfResponse(
    SupplierPaymentVoucherDocument({ payment: plainPayment }),
    `${voucherNumber(payment)}.pdf`
  );
}

export const GET = withModuleAccess("procurement", handleGET);
