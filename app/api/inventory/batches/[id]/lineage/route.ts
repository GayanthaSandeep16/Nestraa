import { NextResponse, type NextRequest } from "next/server";
import { getBatchLineage } from "@/lib/services/inventory";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/inventory/batches/[id]/lineage">) {
  const { id } = await ctx.params;
  const result = await getBatchLineage(id);
  if (!result) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
