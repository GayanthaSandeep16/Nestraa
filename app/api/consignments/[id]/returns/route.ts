import { NextResponse, type NextRequest } from "next/server";
import { listConsignmentReturns, recordConsignmentReturn } from "@/lib/services/consignment-returns";
import { consignmentReturnSchema } from "@/lib/validation/consignment-returns";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/consignments/[id]/returns">) {
  const { id } = await ctx.params;
  const returns = await listConsignmentReturns(id);
  return NextResponse.json(returns);
}

async function handlePOST(request: NextRequest, ctx: RouteContext<"/api/consignments/[id]/returns">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = consignmentReturnSchema.safeParse({ ...body, consignmentId: id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const consignmentReturn = await recordConsignmentReturn(parsed.data, currentUser?.id);
    return NextResponse.json(consignmentReturn, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds remaining held stock")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("consignment", handleGET);
export const POST = withModuleAccess("consignment", handlePOST);
