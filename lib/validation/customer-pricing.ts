import { z } from "zod";

export const customerPricingSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  materialId: z.string().uuid("Product is required"),
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

export type CustomerPricingFormValues = z.input<typeof customerPricingSchema>;

export const endPricingSchema = z.object({
  effectiveTo: z.string().min(1, "End date is required"),
});
