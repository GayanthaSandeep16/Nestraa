import { NextResponse, type NextRequest } from "next/server";
import { completeProductionOrder } from "@/lib/services/production-orders";
import { productionOrderCompletionSchema } from "@/lib/validation/production-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/production-orders/[id]/complete">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = productionOrderCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await completeProductionOrder(id, { ...parsed.data, completedBy: currentUser?.id });
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
