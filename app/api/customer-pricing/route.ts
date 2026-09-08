import { NextResponse, type NextRequest } from "next/server";
import { createCustomerPricing, listCustomerPricing } from "@/lib/services/customer-pricing";
import { customerPricingSchema } from "@/lib/validation/customer-pricing";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const rows = await listCustomerPricing();
  return NextResponse.json(rows);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = customerPricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await createCustomerPricing(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
