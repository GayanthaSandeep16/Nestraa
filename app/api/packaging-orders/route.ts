import { NextResponse, type NextRequest } from "next/server";
import { createPackagingOrder, listPackagingOrders } from "@/lib/services/packaging-orders";
import { packagingOrderSchema } from "@/lib/validation/packaging-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const orders = await listPackagingOrders();
  return NextResponse.json(orders);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = packagingOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await createPackagingOrder({ ...parsed.data, createdBy: currentUser?.id });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("packaging", handleGET);
export const POST = withModuleAccess("packaging", handlePOST);
