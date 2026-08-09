import { NextResponse, type NextRequest } from "next/server";
import { softDeleteProduct, updateProduct } from "@/lib/services/products";
import { productUpdateSchema } from "@/lib/validation/products";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = productUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await updateProduct(id, parsed.data);
    return NextResponse.json(product);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const { id } = await ctx.params;
  await softDeleteProduct(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("product-catalog", handlePATCH);
export const DELETE = withModuleAccess("product-catalog", handleDELETE);
