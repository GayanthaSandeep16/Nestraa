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

export const packagingOrderSchema = z.object({
  processedMaterialId: z.string().uuid("Processed material is required"),
  finishedProductId: z.string().uuid("Finished product is required"),
  packageSizeId: z.string().uuid("Package size is required"),
  plannedQuantity: z.coerce.number().positive("Planned quantity must be greater than 0"),
});

export type PackagingOrderFormValues = z.input<typeof packagingOrderSchema>;

const packagingOrderInputBatchSchema = z.object({
  batchId: z.string().uuid("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  uomId: z.string().uuid("Unit of measure is required"),
});

export const packagingOrderCompletionSchema = z.object({
  inputs: z.array(packagingOrderInputBatchSchema).min(1, "Pick at least one input batch"),
  output: z.object({
    quantity: z.coerce.number().positive("Output quantity must be greater than 0"),
    uomId: z.string().uuid("Unit of measure is required"),
    warehouseId: z.string().uuid("Warehouse is required"),
    unitCost: z.coerce.number().min(0).optional(),
    manufactureDate: optionalDate(),
    expiryDate: optionalDate(),
    qcResult: z
      .union([z.enum(qcResultValues), z.literal("")])
      .optional()
      .transform((value) => (value ? value : undefined)),
  }),
  barcode: optionalString(),
});

export type PackagingOrderCompletionFormValues = z.input<typeof packagingOrderCompletionSchema>;
