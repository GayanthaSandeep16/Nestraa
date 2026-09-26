import { NextResponse, type NextRequest } from "next/server";
import { countProducts, createProduct, listProducts } from "@/lib/services/products";
import { productSchema } from "@/lib/validation/products";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listProducts(p), countProducts));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const product = await createProduct(parsed.data);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("product-catalog", handleGET);
export const POST = withModuleAccess("product-catalog", handlePOST);
