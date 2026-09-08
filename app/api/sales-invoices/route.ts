import { NextResponse, type NextRequest } from "next/server";
import { createSalesInvoice, listSalesInvoices } from "@/lib/services/sales-invoices";
import { salesInvoiceSchema } from "@/lib/validation/sales-invoices";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const invoices = await listSalesInvoices();
  return NextResponse.json(invoices);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = salesInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const invoice = await createSalesInvoice(parsed.data, currentUser?.id);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
