import { NextResponse, type NextRequest } from "next/server";
import { listMovements, type MovementFilters } from "@/lib/services/inventory";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters: MovementFilters = {
    materialId: searchParams.get("materialId") ?? undefined,
    warehouseId: searchParams.get("warehouseId") ?? undefined,
    direction: (searchParams.get("direction") as MovementFilters["direction"]) ?? undefined,
    source: searchParams.get("source") ?? undefined,
  };

  const movements = await listMovements(filters);
  return NextResponse.json(movements);
}

export const GET = withModuleAccess("inventory", handleGET);
