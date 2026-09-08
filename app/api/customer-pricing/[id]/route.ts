import { NextResponse, type NextRequest } from "next/server";
import { endCustomerPricing } from "@/lib/services/customer-pricing";
import { endPricingSchema } from "@/lib/validation/customer-pricing";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/customer-pricing/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = endPricingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await endCustomerPricing(id, parsed.data.effectiveTo);
    return NextResponse.json(row);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const PATCH = withModuleAccess("sales", handlePATCH);
