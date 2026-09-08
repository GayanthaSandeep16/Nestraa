import { NextResponse, type NextRequest } from "next/server";
import { countSalesOrders, createSalesOrder, listSalesOrders } from "@/lib/services/sales-orders";
import { salesOrderSchema } from "@/lib/validation/sales-orders";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { pageResponse, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const page = parsePage(request);
  if (!page) return NextResponse.json(await listSalesOrders());

  const [rows, total] = await Promise.all([listSalesOrders(page), countSalesOrders()]);
  return NextResponse.json(pageResponse(rows, total, page));
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
