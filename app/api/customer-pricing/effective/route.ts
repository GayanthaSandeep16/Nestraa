import { NextResponse, type NextRequest } from "next/server";
import { getEffectivePrice } from "@/lib/services/customer-pricing";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const materialId = searchParams.get("materialId");
  if (!customerId || !materialId) {
    return NextResponse.json({ error: "customerId and materialId are required" }, { status: 400 });
  }

  const unitPrice = await getEffectivePrice(customerId, materialId, searchParams.get("onDate") ?? undefined);
  return NextResponse.json({ unitPrice: unitPrice ? unitPrice.toString() : null });
}

export const GET = withModuleAccess("sales", handleGET);
