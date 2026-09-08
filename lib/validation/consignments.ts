import { z } from "zod";

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const consignmentItemSchema = z.object({
  materialId: z.string().min(1),
  batchId: optionalText(),
  quantityDelivered: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0),
});

export const consignmentSchema = z.object({
  customerId: z.string().min(1, "Retailer is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  salesRepId: optionalText(),
  notes: optionalText(),
  items: z.array(consignmentItemSchema).min(1, "Add at least one item"),
});

export type ConsignmentFormValues = z.input<typeof consignmentSchema>;
