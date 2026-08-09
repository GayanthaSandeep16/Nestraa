import { NextResponse, type NextRequest } from "next/server";
import { createProductionOrder, listProductionOrders } from "@/lib/services/production-orders";
import { productionOrderSchema } from "@/lib/validation/production-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const orders = await listProductionOrders();
  return NextResponse.json(orders);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = productionOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await createProductionOrder({ ...parsed.data, createdBy: currentUser?.id });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("production", handleGET);
export const POST = withModuleAccess("production", handlePOST);
