import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const retailerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: optionalText(),
  phone: optionalText(),
  email: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  address: optionalText(),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerms: optionalText(),
  retailerCode: optionalText(),
  assignedSalesRepId: optionalText(),
  route: optionalText(),
});

export type RetailerFormValues = z.input<typeof retailerSchema>;

export const retailerUpdateSchema = retailerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
