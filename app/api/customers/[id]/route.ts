import { NextResponse, type NextRequest } from "next/server";
import { softDeleteCustomer, updateCustomer } from "@/lib/services/customers";
import { customerUpdateSchema } from "@/lib/validation/customers";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await updateCustomer(id, parsed.data);
  return NextResponse.json(customer);
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const { id } = await ctx.params;
  await softDeleteCustomer(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("sales", handlePATCH);
export const DELETE = withModuleAccess("sales", handleDELETE);
