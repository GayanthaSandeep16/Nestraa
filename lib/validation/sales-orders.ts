import { z } from "zod";

const salesOrderItemSchema = z.object({
  materialId: z.string().uuid("Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price must be 0 or more"),
  discountPct: z.coerce.number().min(0).max(100).optional(),
});

export const salesOrderSchema = z.object({
  customerId: z.string().uuid("Customer is required"),
  items: z.array(salesOrderItemSchema).min(1, "Add at least one line item"),
});

export type SalesOrderFormValues = z.input<typeof salesOrderSchema>;

export const salesOrderStatusValues = ["completed", "cancelled"] as const;

export const salesOrderStatusSchema = z.object({
  status: z.enum(salesOrderStatusValues),
});
