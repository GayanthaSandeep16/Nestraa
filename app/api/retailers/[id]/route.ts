import { NextResponse, type NextRequest } from "next/server";
import { softDeleteRetailer, updateRetailer } from "@/lib/services/retailers";
import { retailerUpdateSchema } from "@/lib/validation/retailers";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/retailers/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = retailerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const retailer = await updateRetailer(id, parsed.data);
    return NextResponse.json(retailer);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/retailers/[id]">) {
  const { id } = await ctx.params;
  await softDeleteRetailer(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("consignment", handlePATCH);
export const DELETE = withModuleAccess("consignment", handleDELETE);
