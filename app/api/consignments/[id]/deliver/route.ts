import { NextResponse, type NextRequest } from "next/server";
import { deliverConsignment } from "@/lib/services/consignments";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePOST(_request: NextRequest, ctx: RouteContext<"/api/consignments/[id]/deliver">) {
  const { id } = await ctx.params;
  try {
    const currentUser = await getCurrentAppUser();
    const consignment = await deliverConsignment(id, currentUser?.id);
    return NextResponse.json(consignment);
  } catch (error) {
    if (error instanceof Error && error.message === "Only draft consignments can be delivered") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return toErrorResponse(error);
  }
}

export const POST = withModuleAccess("consignment", handlePOST);
