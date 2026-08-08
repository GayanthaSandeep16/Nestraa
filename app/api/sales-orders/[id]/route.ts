import { NextResponse, type NextRequest } from "next/server";
import { updateSalesOrderStatus } from "@/lib/services/sales-orders";
import { salesOrderStatusSchema } from "@/lib/validation/sales-orders";
import { toErrorResponse } from "@/lib/api/errors";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/sales-orders/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = salesOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const order = await updateSalesOrderStatus(id, parsed.data.status);
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
