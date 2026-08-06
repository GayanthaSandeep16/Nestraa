import { NextResponse, type NextRequest } from "next/server";
import { createMaterial, listMaterials } from "@/lib/services/materials";
import { materialSchema } from "@/lib/validation/materials";
import { toErrorResponse } from "@/lib/api/errors";

export async function GET() {
  const materials = await listMaterials();
  return NextResponse.json(materials);
}

export async function POST(request: NextRequest) {
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
