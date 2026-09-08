export const ROLE_NAMES = ["admin", "procurement", "production", "sales", "warehouse", "sales_rep"] as const;
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
  "consignment",
  "reports",
  "planning",
  "admin",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export function isRoleName(value: string | null | undefined): value is RoleName {
  return !!value && (ROLE_NAMES as readonly string[]).includes(value);
}

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}
