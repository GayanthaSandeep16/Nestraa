import { NextResponse, type NextRequest } from "next/server";
import { countConsignments, createConsignment, listConsignments } from "@/lib/services/consignments";
import { consignmentSchema } from "@/lib/validation/consignments";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listConsignments(p), countConsignments));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = consignmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const consignment = await createConsignment(parsed.data, currentUser?.id);
    return NextResponse.json(consignment, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("consignment", handleGET);
export const POST = withModuleAccess("consignment", handlePOST);
