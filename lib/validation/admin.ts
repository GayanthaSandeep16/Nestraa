import { z } from "zod";
import { MODULE_KEYS, ROLE_NAMES } from "@/lib/auth/roles";

export const userUpdateSchema = z.object({
  roleName: z.enum(ROLE_NAMES).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const accessUpdateSchema = z.object({
  roleName: z.enum(ROLE_NAMES),
  moduleKeys: z.array(z.enum(MODULE_KEYS)),
});
