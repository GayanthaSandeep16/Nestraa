import { z } from "zod";
import { paymentMethodValues } from "@/lib/validation/payments";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const supplierPaymentSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  supplierInvoiceId: optionalText(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.enum(paymentMethodValues),
  referenceNumber: optionalText(),
  notes: optionalText(),
});

export type SupplierPaymentFormValues = z.input<typeof supplierPaymentSchema>;
