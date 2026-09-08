import { NextResponse, type NextRequest } from "next/server";
import { countDeliveryNotes, createDeliveryNote, listDeliveryNotes } from "@/lib/services/delivery-notes";
import { deliveryNoteSchema } from "@/lib/validation/delivery-notes";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { toErrorResponse } from "@/lib/api/errors";
import { pageResponse, parsePage } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  const page = parsePage(request);
  if (!page) return NextResponse.json(await listDeliveryNotes());

  const [rows, total] = await Promise.all([listDeliveryNotes(page), countDeliveryNotes()]);
  return NextResponse.json(pageResponse(rows, total, page));
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
