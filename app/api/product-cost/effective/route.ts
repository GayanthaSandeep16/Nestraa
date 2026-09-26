import { NextResponse, type NextRequest } from "next/server";
import { getEffectiveCost } from "@/lib/services/product-cost";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("materialId");
  if (!materialId) {
    return NextResponse.json({ error: "materialId is required" }, { status: 400 });
  }

  const effective = await getEffectiveCost(materialId, searchParams.get("onDate") ?? undefined);
  return NextResponse.json({
    unitCost: effective ? effective.unitCost.toString() : null,
    unitPrice: effective ? effective.unitPrice.toString() : null,
  });
}

export const GET = withModuleAccess("cost-management", handleGET);
