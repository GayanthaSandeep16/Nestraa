import { z } from "zod";

const optionalUuid = () =>
  z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

export const supplierInvoiceSchema = z.object({
  supplierId: z.string().uuid("Supplier is required"),
  grnId: optionalUuid(),
  // Auto-generated (SINV-<epoch>) when omitted — see generateSupplierInvoiceNo.
  invoiceNo: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  invoiceDate: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  totalAmount: z.coerce.number().positive("Total must be greater than 0"),
});

export type SupplierInvoiceFormValues = z.input<typeof supplierInvoiceSchema>;

// Status is derived (see recomputeSupplierInvoiceStatus) — no manual set.
export const supplierInvoiceStatusValues = ["unpaid", "partially_paid", "paid"] as const;
