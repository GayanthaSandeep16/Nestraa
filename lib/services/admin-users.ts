import { prisma } from "@/lib/db/prisma";
import type { RoleName } from "@/lib/auth/roles";

export function listAppUsers() {
  return prisma.appUser.findMany({
    include: { role: true },
    orderBy: { fullName: "asc" },
  });
}

export function getAppUser(id: string) {
  return prisma.appUser.findUnique({ where: { id }, include: { role: true } });
}

export function countActiveAdmins() {
  return prisma.appUser.count({ where: { isActive: true, role: { name: "admin" } } });
}

export function updateAppUser(
  id: string,
  data: { roleName?: RoleName | null; isActive?: boolean },
) {
  const { roleName, isActive } = data;
  return prisma.appUser.update({
    where: { id },
    data: {
      isActive,
      ...(roleName === undefined
        ? {}
        : roleName === null
          ? { role: { disconnect: true } }
          : { role: { connect: { name: roleName } } }),
    },
    include: { role: true },
  });
}
