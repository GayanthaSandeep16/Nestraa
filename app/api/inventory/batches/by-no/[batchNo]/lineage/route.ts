import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getBatchLineage } from "@/lib/services/inventory";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/inventory/batches/by-no/[batchNo]/lineage">) {
  const { batchNo } = await ctx.params;
  const batch = await prisma.batch.findUnique({ where: { batchNo } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  const result = await getBatchLineage(batch.id);
  return NextResponse.json(result);
}
