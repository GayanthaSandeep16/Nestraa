import { NextResponse, type NextRequest } from "next/server";
import { countGrns, createGrn, listGrns } from "@/lib/services/grns";
import { grnSchema } from "@/lib/validation/grns";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { pageResponse, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const page = parsePage(request);
  if (!page) return NextResponse.json(await listGrns());

  const [rows, total] = await Promise.all([listGrns(page), countGrns()]);
  return NextResponse.json(pageResponse(rows, total, page));
}

async function handlePOST(request: NextRequest) {
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

export const GET = withModuleAccess("procurement", handleGET);
export const POST = withModuleAccess("procurement", handlePOST);
