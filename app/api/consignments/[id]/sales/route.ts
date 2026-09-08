import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordConsignmentSale } from "@/lib/services/consignments";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { withModuleAccess } from "@/lib/auth/guard";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        consignmentItemId: z.string().min(1),
        quantity: z.coerce.number().positive(),
      })
    )
    .min(1),
});

async function handlePOST(request: NextRequest, ctx: RouteContext<"/api/consignments/[id]/sales">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const consignment = await recordConsignmentSale(id, parsed.data.items, currentUser?.id);
    return NextResponse.json(consignment);
  } catch (error) {
    if (error instanceof Error && error.message.includes("exceeds remaining held stock")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return toErrorResponse(error);
  }
}

export const POST = withModuleAccess("consignment", handlePOST);
