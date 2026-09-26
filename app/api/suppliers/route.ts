import { NextResponse, type NextRequest } from "next/server";
import { countSuppliers, createSupplier, listSuppliers } from "@/lib/services/suppliers";
import { supplierSchema } from "@/lib/validation/suppliers";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listSuppliers(p), countSuppliers));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await createSupplier(parsed.data);
  return NextResponse.json(supplier, { status: 201 });
}

export const GET = withModuleAccess("suppliers-materials", handleGET);
export const POST = withModuleAccess("suppliers-materials", handlePOST);
