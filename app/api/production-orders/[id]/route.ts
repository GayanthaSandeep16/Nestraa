import { NextResponse, type NextRequest } from "next/server";
import { cancelProductionOrder } from "@/lib/services/production-orders";
import { toErrorResponse } from "@/lib/api/errors";

export async function PATCH(_request: NextRequest, ctx: RouteContext<"/api/production-orders/[id]">) {
  const { id } = await ctx.params;

  try {
    const order = await cancelProductionOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
