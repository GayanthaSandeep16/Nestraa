import { NextResponse, type NextRequest } from "next/server";
import { createSupplier, listSuppliers } from "@/lib/services/suppliers";
import { supplierSchema } from "@/lib/validation/suppliers";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const suppliers = await listSuppliers();
  return NextResponse.json(suppliers);
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
