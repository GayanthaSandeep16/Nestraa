import { z } from "zod";

export const customerTypeValues = ["hotel", "retail", "wholesale", "individual"] as const;

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerType: z.enum(customerTypeValues),
  contactPerson: optionalText(),
  phone: optionalText(),
  email: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  address: optionalText(),
  creditLimit: z.coerce.number().min(0).optional(),
  paymentTerms: optionalText(),
});

export type CustomerFormValues = z.input<typeof customerSchema>;

export const customerUpdateSchema = customerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
