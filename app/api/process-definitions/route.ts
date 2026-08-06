import { NextResponse, type NextRequest } from "next/server";
import { createProcessDefinition, listProcessDefinitions } from "@/lib/services/process-definitions";
import { processDefinitionSchema } from "@/lib/validation/process-definitions";

export async function GET() {
  const processDefinitions = await listProcessDefinitions();
  return NextResponse.json(processDefinitions);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = processDefinitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const processDefinition = await createProcessDefinition(parsed.data);
  return NextResponse.json(processDefinition, { status: 201 });
}
