import { NextResponse, type NextRequest } from "next/server";
import { completePackagingOrder } from "@/lib/services/packaging-orders";
import { packagingOrderCompletionSchema } from "@/lib/validation/packaging-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";

export async function POST(request: NextRequest, ctx: RouteContext<"/api/packaging-orders/[id]/complete">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = packagingOrderCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await completePackagingOrder(id, { ...parsed.data, completedBy: currentUser?.id });
    return NextResponse.json(order);
  } catch (error) {
    return toErrorResponse(error);
  }
}
