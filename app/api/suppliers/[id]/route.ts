import { NextResponse, type NextRequest } from "next/server";
import { softDeleteSupplier, updateSupplier } from "@/lib/services/suppliers";
import { supplierUpdateSchema } from "@/lib/validation/suppliers";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/suppliers/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = supplierUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await updateSupplier(id, parsed.data);
  return NextResponse.json(supplier);
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/suppliers/[id]">) {
  const { id } = await ctx.params;
  await softDeleteSupplier(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("suppliers-materials", handlePATCH);
export const DELETE = withModuleAccess("suppliers-materials", handleDELETE);
