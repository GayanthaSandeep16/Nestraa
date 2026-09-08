import { NextResponse, type NextRequest } from "next/server";
import { getSalesInvoice } from "@/lib/services/sales-invoices";
import { withModuleAccess } from "@/lib/auth/guard";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { logAudit } from "@/lib/services/audit";
import { InvoiceDocument, invoiceNumber } from "@/lib/pdf/InvoiceDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/sales-invoices/[id]/pdf">) {
  const { id } = await ctx.params;
  const invoice = await getSalesInvoice(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const user = await getCurrentAppUser();
  await logAudit({ tableName: "sales_invoices", recordId: id, action: "print", changedBy: user?.id });

  const plainInvoice = JSON.parse(JSON.stringify(invoice));

  return renderPdfResponse(InvoiceDocument({ invoice: plainInvoice }), `${invoiceNumber(invoice)}.pdf`);
}

export const GET = withModuleAccess("sales", handleGET);
