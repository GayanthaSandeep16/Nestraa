import { z } from "zod";

export const poStatusValues = ["draft", "sent", "partially_received", "received", "closed", "cancelled"] as const;

const purchaseOrderItemSchema = z.object({
  materialId: z.string().uuid("Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  uomId: z.string().uuid("Unit of measure is required"),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Supplier is required"),
  expectedDate: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional()
  ),
  items: z.array(purchaseOrderItemSchema).min(1, "Add at least one line item"),
});

export type PurchaseOrderFormValues = z.input<typeof purchaseOrderSchema>;

export const purchaseOrderStatusSchema = z.object({
  status: z.enum(poStatusValues),
});
