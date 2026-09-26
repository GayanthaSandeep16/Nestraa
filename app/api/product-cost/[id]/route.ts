import { NextResponse, type NextRequest } from "next/server";
import { endProductCost } from "@/lib/services/product-cost";
import { endProductCostSchema } from "@/lib/validation/product-cost";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/product-cost/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = endProductCostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await endProductCost(id, parsed.data.effectiveTo);
    return NextResponse.json(row);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const PATCH = withModuleAccess("cost-management", handlePATCH);
