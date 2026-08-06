import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

export function toErrorResponse(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const fields = (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
    return NextResponse.json({ error: `A record with that ${fields} already exists.` }, { status: 409 });
  }
  throw error;
}
