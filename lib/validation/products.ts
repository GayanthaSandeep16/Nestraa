import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
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

export type ProductFormValues = z.input<typeof productSchema>;

export const productUpdateSchema = productSchema.partial().extend({
  isActive: z.boolean().optional(),
});
