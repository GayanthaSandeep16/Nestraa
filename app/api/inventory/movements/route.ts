import { NextResponse, type NextRequest } from "next/server";
import { countMovements, listMovements, type MovementFilters } from "@/lib/services/inventory";
import { pageArgs, pageResponse, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const filters: MovementFilters = {
    materialId: searchParams.get("materialId") ?? undefined,
    warehouseId: searchParams.get("warehouseId") ?? undefined,
    direction: (searchParams.get("direction") as MovementFilters["direction"]) ?? undefined,
    source: searchParams.get("source") ?? undefined,
  };

  const page = parsePage(request);
  if (!page) return NextResponse.json(await listMovements(filters));

  const [rows, total] = await Promise.all([listMovements(filters, pageArgs(page)), countMovements(filters)]);
  return NextResponse.json(pageResponse(rows, total, page));
}

export const GET = withModuleAccess("inventory", handleGET);
