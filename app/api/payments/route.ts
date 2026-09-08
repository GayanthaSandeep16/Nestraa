import { NextResponse, type NextRequest } from "next/server";
import { listPayments, recordPayment } from "@/lib/services/payments";
import { paymentSchema } from "@/lib/validation/payments";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const payments = await listPayments({
    customerId: searchParams.get("customerId") ?? undefined,
    consignmentId: searchParams.get("consignmentId") ?? undefined,
  });
  return NextResponse.json(payments);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const payment = await recordPayment(parsed.data, currentUser?.id);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("consignment", handleGET);
export const POST = withModuleAccess("consignment", handlePOST);
