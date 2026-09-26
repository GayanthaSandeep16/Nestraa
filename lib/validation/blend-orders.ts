import { z } from "zod";
import { qcResultValues } from "@/lib/validation/grns";

const optionalDate = () =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional()
  );

export const blendOrderSchema = z.object({
  recipeId: z.string().uuid("Recipe is required"),
  plannedQuantity: z.coerce.number().positive("Planned quantity must be greater than 0"),
});

export type BlendOrderFormValues = z.input<typeof blendOrderSchema>;

const blendOrderInputBatchSchema = z.object({
  materialId: z.string().uuid("Material is required"),
  batchId: z.string().uuid("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  uomId: z.string().uuid("Unit of measure is required"),
});

export const blendOrderCompletionSchema = z.object({
  inputs: z.array(blendOrderInputBatchSchema).min(1, "Pick at least one input batch"),
  output: z.object({
    quantity: z.coerce.number().positive("Output quantity must be greater than 0"),
    uomId: z.string().uuid("Unit of measure is required"),
    warehouseId: z.string().uuid("Warehouse is required"),
    manufactureDate: optionalDate(),
    expiryDate: optionalDate(),
    qcResult: z
      .union([z.enum(qcResultValues), z.literal("")])
      .optional()
      .transform((value) => (value ? value : undefined)),
  }),
});

export type BlendOrderCompletionFormValues = z.input<typeof blendOrderCompletionSchema>;
