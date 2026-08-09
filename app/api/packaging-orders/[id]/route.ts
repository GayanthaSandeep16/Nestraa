import { NextResponse, type NextRequest } from "next/server";
import { cancelPackagingOrder } from "@/lib/services/packaging-orders";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(_request: NextRequest, ctx: RouteContext<"/api/packaging-orders/[id]">) {
  const { id } = await ctx.params;

  try {
    const order = await cancelPackagingOrder(id);
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const PATCH = withModuleAccess("packaging", handlePATCH);
