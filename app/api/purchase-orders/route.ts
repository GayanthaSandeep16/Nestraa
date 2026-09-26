import { NextResponse, type NextRequest } from "next/server";
import { countPurchaseOrders, createPurchaseOrder, listPurchaseOrders } from "@/lib/services/purchase-orders";
import { purchaseOrderSchema } from "@/lib/validation/purchase-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listPurchaseOrders(p), countPurchaseOrders));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = purchaseOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const purchaseOrder = await createPurchaseOrder({ ...parsed.data, createdBy: currentUser?.id });
    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("procurement", handleGET);
export const POST = withModuleAccess("procurement", handlePOST);
