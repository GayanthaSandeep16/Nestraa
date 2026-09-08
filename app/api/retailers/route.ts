import { NextResponse, type NextRequest } from "next/server";
import { createRetailer, listRetailers } from "@/lib/services/retailers";
import { retailerSchema } from "@/lib/validation/retailers";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const retailers = await listRetailers();
  return NextResponse.json(retailers);
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
