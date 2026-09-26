import { z } from "zod";
import { qcResultValues } from "@/lib/validation/grns";

const optionalDate = () =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional()
  );

const optionalString = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const productionOrderSchema = z.object({
  processId: z.string().uuid("Process is required"),
  plannedQuantity: z.coerce.number().positive("Planned quantity must be greater than 0"),
  plannedStartDate: optionalDate(),
});

export type ProductionOrderFormValues = z.input<typeof productionOrderSchema>;

const productionOrderInputBatchSchema = z.object({
  batchId: z.string().uuid("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  uomId: z.string().uuid("Unit of measure is required"),
});

export const productionOrderCompletionSchema = z.object({
  inputs: z.array(productionOrderInputBatchSchema).min(1, "Pick at least one input batch"),
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
  waste: z
    .object({
      quantity: z.coerce.number().min(0).optional(),
      uomId: z
        .union([z.string().uuid(), z.literal("")])
        .optional()
        .transform((value) => (value ? value : undefined)),
      reason: optionalString(),
    })
    .optional(),
});

export type ProductionOrderCompletionFormValues = z.input<typeof productionOrderCompletionSchema>;
