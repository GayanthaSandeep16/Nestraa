import { NextResponse, type NextRequest } from "next/server";
import { getConsignment } from "@/lib/services/consignments";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/consignments/[id]">) {
  const { id } = await ctx.params;
  const consignment = await getConsignment(id);
  if (!consignment) {
    return NextResponse.json({ error: "Consignment not found" }, { status: 404 });
  }
  return NextResponse.json(consignment);
}

export const GET = withModuleAccess("consignment", handleGET);
