import { z } from "zod";

export const deliveryNoteSchema = z.object({
  invoiceId: z.string().uuid("Invoice is required"),
  notes: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type DeliveryNoteFormValues = z.input<typeof deliveryNoteSchema>;
