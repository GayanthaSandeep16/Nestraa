export const ROLE_NAMES = ["admin", "procurement", "production", "sales", "warehouse"] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export const MODULE_KEYS = [
  "dashboard",
  "suppliers-materials",
  "product-catalog",
  "procurement",
  "inventory",
  "production",
  "packaging",
  "sales",
  "reports",
  "planning",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

// Which roles can access which top-level module. Adjust freely — this is a
// plain code map, not schema, so changes don't need a migration.
const MODULE_ACCESS: Record<ModuleKey, RoleName[]> = {
  dashboard: ["admin", "procurement", "production", "sales", "warehouse"],
  "suppliers-materials": ["admin", "procurement"],
  "product-catalog": ["admin", "procurement", "production"],
  procurement: ["admin", "procurement", "warehouse"],
  inventory: ["admin", "procurement", "production", "sales", "warehouse"],
  production: ["admin", "production"],
  packaging: ["admin", "production", "warehouse"],
  sales: ["admin", "sales"],
  reports: ["admin", "procurement", "production", "sales", "warehouse"],
  planning: ["admin", "production"],
};

function isRoleName(value: string): value is RoleName {
  return (ROLE_NAMES as readonly string[]).includes(value);
}

export function canAccessModule(roleName: string | null | undefined, moduleKey: ModuleKey): boolean {
  if (!roleName || !isRoleName(roleName)) return false;
  return MODULE_ACCESS[moduleKey].includes(roleName);
}

export function modulesForRole(roleName: string | null | undefined): ModuleKey[] {
  if (!roleName || !isRoleName(roleName)) return [];
  return MODULE_KEYS.filter((key) => MODULE_ACCESS[key].includes(roleName));
}
