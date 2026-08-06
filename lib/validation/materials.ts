import { z } from "zod";

export const materialTypeValues = ["raw", "processed", "packaging", "finished_good"] as const;

export const materialSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  materialType: z.enum(materialTypeValues),
  categoryId: z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  baseUomId: z.string().uuid("Unit of measure is required"),
  reorderLevel: z.coerce.number().min(0).optional(),
  reorderQty: z.coerce.number().min(0).optional(),
  shelfLifeDays: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(0).optional()
  ),
});

export type MaterialFormValues = z.input<typeof materialSchema>;

export const materialUpdateSchema = materialSchema.partial().extend({
  isActive: z.boolean().optional(),
});
