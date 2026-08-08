import { NextResponse, type NextRequest } from "next/server";
import { softDeleteCustomer, updateCustomer } from "@/lib/services/customers";
import { customerUpdateSchema } from "@/lib/validation/customers";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = customerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await updateCustomer(id, parsed.data);
  return NextResponse.json(customer);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const { id } = await ctx.params;
  await softDeleteCustomer(id);
  return new NextResponse(null, { status: 204 });
}
