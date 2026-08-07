import { NextResponse, type NextRequest } from "next/server";
import { getAvailableBatches } from "@/lib/services/inventory";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get("materialId");
  if (!materialId) {
    return NextResponse.json({ error: "materialId is required" }, { status: 400 });
  }

  const batches = await getAvailableBatches(materialId, searchParams.get("warehouseId") ?? undefined);
  return NextResponse.json(batches);
}
