import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

// [id] is the retailer's customerId. Kept separate from PATCH /api/retailers/[id]
// because that route's schema coerces "" -> undefined and so can't clear an
// assignment; here null is a real value.
const schema = z.object({ assignedSalesRepId: z.string().uuid().nullable() });

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/admin/retailer-assignments/[id]">) {
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const updated = await prisma.retailerProfile.update({
      where: { customerId: id },
      data: { assignedSalesRepId: parsed.data.assignedSalesRepId },
      include: { customer: true, assignedSalesRep: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const PATCH = withModuleAccess("admin", handlePATCH);
