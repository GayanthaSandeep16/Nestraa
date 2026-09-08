import { z } from "zod";
import { returnQualityStatusValues } from "@/lib/validation/consignment-returns";

const optionalUuid = () =>
  z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

export const salesReturnItemSchema = z.object({
  materialId: z.string().uuid("Product is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  qualityStatus: z.enum(returnQualityStatusValues),
});

export const salesReturnSchema = z
  .object({
    invoiceId: optionalUuid(),
    customerId: optionalUuid(),
    reason: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    items: z.array(salesReturnItemSchema).min(1, "Add at least one return line"),
  })
  .refine((data) => data.invoiceId || data.customerId, {
    message: "Invoice or customer is required",
    path: ["customerId"],
  });

export type SalesReturnFormValues = z.input<typeof salesReturnSchema>;
