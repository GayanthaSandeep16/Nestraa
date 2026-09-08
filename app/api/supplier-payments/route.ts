import { NextResponse, type NextRequest } from "next/server";
import { listSupplierPayments, recordSupplierPayment } from "@/lib/services/supplier-payments";
import { supplierPaymentSchema } from "@/lib/validation/supplier-payments";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const payments = await listSupplierPayments({
    supplierId: searchParams.get("supplierId") ?? undefined,
    supplierInvoiceId: searchParams.get("supplierInvoiceId") ?? undefined,
  });
  return NextResponse.json(payments);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = supplierPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const payment = await recordSupplierPayment(parsed.data, currentUser?.id);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("procurement", handleGET);
export const POST = withModuleAccess("procurement", handlePOST);
