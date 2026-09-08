import { NextResponse, type NextRequest } from "next/server";
import { createSupplierInvoice, listSupplierInvoices } from "@/lib/services/supplier-invoices";
import { supplierInvoiceSchema } from "@/lib/validation/supplier-invoices";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const invoices = await listSupplierInvoices();
  return NextResponse.json(invoices);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = supplierInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const invoice = await createSupplierInvoice(parsed.data, currentUser?.id);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("procurement", handleGET);
export const POST = withModuleAccess("procurement", handlePOST);
