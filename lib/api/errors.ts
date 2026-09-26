import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

// A business-rule rejection whose message is safe to show the user
// (e.g. "Return quantity exceeds invoiced quantity"). Anything else stays a 500.
export class UserError extends Error {}

export function toErrorResponse(error: unknown) {
  if (error instanceof UserError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
    return NextResponse.json({ error: `A record with that ${fields} already exists.` }, { status: 409 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Record not found, or it is no longer in a state that allows this action." }, { status: 404 });
  }
  throw error;
}
