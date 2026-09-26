import { NextResponse, type NextRequest } from "next/server";
import { countDeliveryNotes, createDeliveryNote, listDeliveryNotes } from "@/lib/services/delivery-notes";
import { deliveryNoteSchema } from "@/lib/validation/delivery-notes";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listDeliveryNotes(p), countDeliveryNotes));
}

async function handlePOST(request: NextRequest) {
  const body = await request.json();
  const parsed = deliveryNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const currentUser = await getCurrentAppUser();
    const note = await createDeliveryNote(parsed.data, currentUser?.id);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export const GET = withModuleAccess("sales", handleGET);
export const POST = withModuleAccess("sales", handlePOST);
