import { NextResponse, type NextRequest } from "next/server";
import { countMaterials, createMaterial, listMaterials } from "@/lib/services/materials";
import { materialSchema } from "@/lib/validation/materials";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listMaterials(p), countMaterials));
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
