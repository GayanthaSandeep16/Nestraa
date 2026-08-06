import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: optionalText(),
  phone: optionalText(),
  email: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  address: optionalText(),
  paymentTerms: optionalText(),
});

export type SupplierFormValues = z.input<typeof supplierSchema>;

export const supplierUpdateSchema = supplierSchema.partial().extend({
  isActive: z.boolean().optional(),
});
