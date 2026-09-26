import { NextResponse, type NextRequest } from "next/server";
import { countBlendOrders, createBlendOrder, listBlendOrders } from "@/lib/services/blend-orders";
import { blendOrderSchema } from "@/lib/validation/blend-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listBlendOrders(p), countBlendOrders));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = blendOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const order = await createBlendOrder({ ...parsed.data, createdBy: currentUser?.id });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("production", handleGET);
export const POST = withModuleAccess("production", handlePOST);
