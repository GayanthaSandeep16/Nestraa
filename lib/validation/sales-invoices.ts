import { z } from "zod";

const optionalUuid = () =>
  z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

const salesInvoiceItemSchema = z.object({
  materialId: z.string().uuid("Product is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  warehouseId: optionalUuid(),
  batchId: optionalUuid(),
});

export const salesInvoiceSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  salesOrderId: optionalUuid(),
  invoiceDate: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  taxAmount: z.coerce.number().min(0).optional(),
  items: z.array(salesInvoiceItemSchema).min(1, "Add at least one line item"),
});

export type SalesInvoiceFormValues = z.input<typeof salesInvoiceSchema>;

// Invoice status is derived (see recomputeInvoiceStatus) — no manual set.
export const salesInvoiceStatusValues = ["unpaid", "partially_paid", "paid"] as const;
