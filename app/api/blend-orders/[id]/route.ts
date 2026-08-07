import { NextResponse, type NextRequest } from "next/server";
import { cancelBlendOrder } from "@/lib/services/blend-orders";
import { toErrorResponse } from "@/lib/api/errors";

export async function PATCH(_request: NextRequest, ctx: RouteContext<"/api/blend-orders/[id]">) {
  const { id } = await ctx.params;

  try {
    const order = await cancelBlendOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
