import { z } from "zod";

export const productCostSchema = z.object({
  materialId: z.string().uuid("Product is required"),
  unitCost: z.coerce.number().min(0, "Unit cost must be 0 or more"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  effectiveFrom: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  effectiveTo: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type ProductCostFormValues = z.input<typeof productCostSchema>;

export const endProductCostSchema = z.object({
  effectiveTo: z.string().min(1, "End date is required"),
});
