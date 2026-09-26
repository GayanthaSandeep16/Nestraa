import { NextResponse, type NextRequest } from "next/server";
import { countCustomerPricing, createCustomerPricing, listCustomerPricing } from "@/lib/services/customer-pricing";
import { customerPricingSchema } from "@/lib/validation/customer-pricing";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listCustomerPricing(p), countCustomerPricing));
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
