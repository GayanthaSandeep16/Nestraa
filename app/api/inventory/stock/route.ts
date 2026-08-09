import { NextResponse, type NextRequest } from "next/server";
import { getCurrentStock, getExpiringBatches, getLowStock } from "@/lib/services/inventory";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "current";

  if (view === "low") {
    const rows = await getLowStock();
    return NextResponse.json(rows);
  }

  if (view === "expiring") {
    const rows = await getExpiringBatches();
    return NextResponse.json(rows);
  }

  const rows = await getCurrentStock({
    materialId: searchParams.get("materialId") ?? undefined,
    warehouseId: searchParams.get("warehouseId") ?? undefined,
  });
  return NextResponse.json(rows);
}

export const GET = withModuleAccess("inventory", handleGET);
