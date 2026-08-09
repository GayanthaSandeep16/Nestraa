import { NextResponse, type NextRequest } from "next/server";
import { softDeleteMaterial, updateMaterial } from "@/lib/services/materials";
import { materialUpdateSchema } from "@/lib/validation/materials";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = materialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const material = await updateMaterial(id, parsed.data);
    return NextResponse.json(material);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/materials/[id]">) {
  const { id } = await ctx.params;
  await softDeleteMaterial(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("suppliers-materials", handlePATCH);
export const DELETE = withModuleAccess("suppliers-materials", handleDELETE);
