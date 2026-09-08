import { NextResponse, type NextRequest } from "next/server";
import { countSalesInvoices, createSalesInvoice, listSalesInvoices } from "@/lib/services/sales-invoices";
import { salesInvoiceSchema } from "@/lib/validation/sales-invoices";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { pageResponse, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const page = parsePage(request);
  if (!page) return NextResponse.json(await listSalesInvoices());

  const [rows, total] = await Promise.all([listSalesInvoices(page), countSalesInvoices()]);
  return NextResponse.json(pageResponse(rows, total, page));
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
