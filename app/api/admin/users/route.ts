import { NextResponse } from "next/server";
import { listAppUsers } from "@/lib/services/admin-users";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  return NextResponse.json(await listAppUsers());
}

export const GET = withModuleAccess("admin", handleGET);
