import { NextResponse, type NextRequest } from "next/server";
import { createProcessDefinition, listProcessDefinitions } from "@/lib/services/process-definitions";
import { processDefinitionSchema } from "@/lib/validation/process-definitions";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const processDefinitions = await listProcessDefinitions();
  return NextResponse.json(processDefinitions);
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = processDefinitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const processDefinition = await createProcessDefinition(parsed.data);
  return NextResponse.json(processDefinition, { status: 201 });
}

export const GET = withModuleAccess("product-catalog", handleGET);
export const POST = withModuleAccess("product-catalog", handlePOST);
