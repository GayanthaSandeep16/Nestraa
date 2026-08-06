import { NextResponse, type NextRequest } from "next/server";
import { createGrn, listGrns } from "@/lib/services/grns";
import { grnSchema } from "@/lib/validation/grns";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";

export async function GET() {
  const grns = await listGrns();
  return NextResponse.json(grns);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = grnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const grn = await createGrn({ ...parsed.data, receivedBy: currentUser?.id });
    return NextResponse.json(grn, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
