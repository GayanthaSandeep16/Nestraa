import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const paymentMethodValues = ["cash", "bank_transfer", "cheque", "other"] as const;

export const paymentSchema = z.object({
  customerId: z.string().min(1, "Retailer is required"),
  consignmentId: optionalText(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(paymentMethodValues),
  referenceNumber: optionalText(),
  notes: optionalText(),
});

export type PaymentFormValues = z.input<typeof paymentSchema>;
