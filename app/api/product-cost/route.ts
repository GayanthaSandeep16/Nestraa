import { NextResponse, type NextRequest } from "next/server";
import { countProductCosts, createProductCost, listProductCosts } from "@/lib/services/product-cost";
import { productCostSchema } from "@/lib/validation/product-cost";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listProductCosts(p), countProductCosts));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = productCostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await createProductCost(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("cost-management", handleGET);
export const POST = withModuleAccess("cost-management", handlePOST);
