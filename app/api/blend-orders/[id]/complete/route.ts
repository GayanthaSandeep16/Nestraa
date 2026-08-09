import { NextResponse, type NextRequest } from "next/server";
import { completeBlendOrder } from "@/lib/services/blend-orders";
import { blendOrderCompletionSchema } from "@/lib/validation/blend-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePOST(request: NextRequest, ctx: RouteContext<"/api/blend-orders/[id]/complete">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = blendOrderCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await completeBlendOrder(id, { ...parsed.data, completedBy: currentUser?.id });
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const POST = withModuleAccess("production", handlePOST);
