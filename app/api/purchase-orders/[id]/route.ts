import { NextResponse, type NextRequest } from "next/server";
import { updatePurchaseOrderStatus } from "@/lib/services/purchase-orders";
import { purchaseOrderStatusSchema } from "@/lib/validation/purchase-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/purchase-orders/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = purchaseOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const purchaseOrder = await updatePurchaseOrderStatus(id, parsed.data.status, currentUser?.id);
    return NextResponse.json(purchaseOrder);
  } catch (error) {
    return toErrorResponse(error);
  }
}
