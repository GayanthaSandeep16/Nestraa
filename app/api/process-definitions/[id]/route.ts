import { NextResponse, type NextRequest } from "next/server";
import { deleteProcessDefinition, updateProcessDefinition } from "@/lib/services/process-definitions";
import { processDefinitionUpdateSchema } from "@/lib/validation/process-definitions";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/process-definitions/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = processDefinitionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const processDefinition = await updateProcessDefinition(id, parsed.data);
  return NextResponse.json(processDefinition);
}

async function handleDELETE(_request: NextRequest, ctx: RouteContext<"/api/process-definitions/[id]">) {
  const { id } = await ctx.params;
  await deleteProcessDefinition(id);
  return new NextResponse(null, { status: 204 });
}

export const PATCH = withModuleAccess("product-catalog", handlePATCH);
export const DELETE = withModuleAccess("product-catalog", handleDELETE);
