import { NextResponse, type NextRequest } from "next/server";
import { countRetailers, createRetailer, listRetailers } from "@/lib/services/retailers";
import { retailerSchema } from "@/lib/validation/retailers";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listRetailers(p), countRetailers));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = retailerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const retailer = await createRetailer(parsed.data);
    return NextResponse.json(retailer, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("consignment", handleGET);
export const POST = withModuleAccess("consignment", handlePOST);
