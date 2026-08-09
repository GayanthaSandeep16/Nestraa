import { NextResponse, type NextRequest } from "next/server";
import { createSalesOrder, listSalesOrders } from "@/lib/services/sales-orders";
import { salesOrderSchema } from "@/lib/validation/sales-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const orders = await listSalesOrders();
  return NextResponse.json(orders);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = salesOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await createSalesOrder({ ...parsed.data, createdBy: currentUser?.id });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
