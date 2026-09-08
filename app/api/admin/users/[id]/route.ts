import { NextResponse, type NextRequest } from "next/server";
import { countActiveAdmins, getAppUser, updateAppUser } from "@/lib/services/admin-users";
import { userUpdateSchema } from "@/lib/validation/admin";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { withModuleAccess } from "@/lib/auth/guard";

async function handlePATCH(request: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const me = await getCurrentAppUser(); // access already checked by withModuleAccess
  const { id } = await ctx.params;

  const parsed = userUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { roleName, isActive } = parsed.data;

  const target = await getAppUser(id);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const changesRole = roleName !== undefined && (roleName ?? null) !== (target.role?.name ?? null);
  const deactivates = isActive === false && target.isActive;

  if (me && id === me.id && (changesRole || deactivates)) {
    return NextResponse.json({ error: "You cannot change your own role or status." }, { status: 400 });
  }

  const targetIsActiveAdmin = target.isActive && target.role?.name === "admin";
  const losesAdmin =
    targetIsActiveAdmin && ((changesRole && roleName !== "admin") || deactivates);
  if (losesAdmin && (await countActiveAdmins()) <= 1) {
    return NextResponse.json({ error: "At least one active admin is required." }, { status: 409 });
  }

  return NextResponse.json(await updateAppUser(id, { roleName, isActive }));
}

export const PATCH = withModuleAccess("admin", handlePATCH);
