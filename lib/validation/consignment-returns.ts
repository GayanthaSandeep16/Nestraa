import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const returnQualityStatusValues = ["good", "damaged", "expired"] as const;

export const consignmentReturnItemSchema = z.object({
  consignmentItemId: z.string().min(1),
  materialId: z.string().min(1),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  qualityStatus: z.enum(returnQualityStatusValues),
});

export const consignmentReturnSchema = z.object({
  consignmentId: z.string().min(1, "Consignment is required"),
  customerId: z.string().min(1),
  notes: optionalText(),
  items: z.array(consignmentReturnItemSchema).min(1, "Add at least one return line"),
});

export type ConsignmentReturnFormValues = z.input<typeof consignmentReturnSchema>;
