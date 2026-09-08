import { prisma } from "@/lib/db/prisma";
import { MODULE_KEYS, ROLE_NAMES, isModuleKey, type ModuleKey, type RoleName } from "@/lib/auth/roles";

// The admin role is always all-access — a product decision and a self-lockout
// guard: a bad access-matrix edit must not be able to strip an admin's own
// access. Everything else is driven by role_permissions rows
// (permission.code == module key), seeded by 20260909100000_seed_module_access.

export async function canRoleAccess(
  roleName: string | null | undefined,
  moduleKey: ModuleKey,
): Promise<boolean> {
  if (!roleName) return false;
  if (roleName === "admin") return true;
  const grant = await prisma.rolePermission.findFirst({
    where: { role: { name: roleName }, permission: { code: moduleKey } },
    select: { roleId: true },
  });
  return grant !== null;
}

export async function modulesForRole(roleName: string | null | undefined): Promise<ModuleKey[]> {
  if (!roleName) return [];
  if (roleName === "admin") return [...MODULE_KEYS];
  const grants = await prisma.rolePermission.findMany({
    where: { role: { name: roleName } },
    select: { permission: { select: { code: true } } },
  });
  return grants.map((g) => g.permission.code).filter(isModuleKey);
}

export async function getAccessMatrix(): Promise<Record<RoleName, ModuleKey[]>> {
  const grants = await prisma.rolePermission.findMany({
    select: { role: { select: { name: true } }, permission: { select: { code: true } } },
  });

  const matrix = Object.fromEntries(ROLE_NAMES.map((r) => [r, [] as ModuleKey[]])) as Record<
    RoleName,
    ModuleKey[]
  >;
  for (const g of grants) {
    const role = g.role.name;
    if (role in matrix && isModuleKey(g.permission.code)) {
      matrix[role as RoleName].push(g.permission.code);
    }
  }
  return matrix;
}

export async function setRoleModules(roleName: RoleName, moduleKeys: ModuleKey[]): Promise<void> {
  if (roleName === "admin") throw new Error("The admin role's access cannot be edited");

  const role = await prisma.role.findUnique({ where: { name: roleName }, select: { id: true } });
  if (!role) throw new Error(`Unknown role: ${roleName}`);

  const perms = await prisma.permission.findMany({
    where: { code: { in: moduleKeys } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    }),
  ]);
}
