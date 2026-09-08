import { NextResponse, type NextRequest } from "next/server";
import { createSalesReturn, listSalesReturns } from "@/lib/services/sales-returns";
import { salesReturnSchema } from "@/lib/validation/sales-returns";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const returns = await listSalesReturns();
  return NextResponse.json(returns);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = salesReturnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const salesReturn = await createSalesReturn(parsed.data, currentUser?.id);
    return NextResponse.json(salesReturn, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds invoiced quantity")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
