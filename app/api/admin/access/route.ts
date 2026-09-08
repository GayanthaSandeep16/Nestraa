import { NextResponse, type NextRequest } from "next/server";
import { getAccessMatrix, setRoleModules } from "@/lib/services/access";
import { accessUpdateSchema } from "@/lib/validation/admin";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  return NextResponse.json(await getAccessMatrix());
}

async function handlePATCH(request: NextRequest) {
  const parsed = accessUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.roleName === "admin") {
    return NextResponse.json({ error: "The admin role's access cannot be edited." }, { status: 400 });
  }

  await setRoleModules(parsed.data.roleName, parsed.data.moduleKeys);
  return NextResponse.json(await getAccessMatrix());
}

export const GET = withModuleAccess("admin", handleGET);
export const PATCH = withModuleAccess("admin", handlePATCH);
