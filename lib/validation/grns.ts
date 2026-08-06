import { z } from "zod";

export const qcResultValues = ["pass", "fail", "conditional_pass"] as const;
export const processingPathValues = ["ready_for_packaging", "requires_processing", "requires_blending"] as const;

const optionalUuid = () =>
  z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalDate = () =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.date().optional()
  );

const grnItemSchema = z.object({
  poItemId: optionalUuid(),
  materialId: z.string().uuid("Material is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitCost: z.coerce.number().min(0, "Unit cost must be 0 or more"),
  uomId: z.string().uuid("Unit of measure is required"),
  qcResult: z
    .union([z.enum(qcResultValues), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  qcNotes: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  processingPath: z
    .union([z.enum(processingPathValues), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  manufactureDate: optionalDate(),
  expiryDate: optionalDate(),
});

export const grnSchema = z.object({
  poId: optionalUuid(),
  supplierId: z.string().uuid("Supplier is required"),
  warehouseId: z.string().uuid("Warehouse is required"),
  notes: z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined)),
  items: z.array(grnItemSchema).min(1, "Add at least one received line"),
});

export type GrnFormValues = z.input<typeof grnSchema>;
