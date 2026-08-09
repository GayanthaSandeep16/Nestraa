import { NextResponse, type NextRequest } from "next/server";
import { createMaterial, listMaterials } from "@/lib/services/materials";
import { materialSchema } from "@/lib/validation/materials";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const materials = await listMaterials();
  return NextResponse.json(materials);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = materialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const material = await createMaterial(parsed.data);
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("suppliers-materials", handleGET);
export const POST = withModuleAccess("suppliers-materials", handlePOST);
