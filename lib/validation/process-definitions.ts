import { z } from "zod";

const optionalUuid = () =>
  z
    .union([z.string().uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

const optionalText = () =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value : undefined));

export const processDefinitionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  inputMaterialId: optionalUuid(),
  outputMaterialId: optionalUuid(),
  expectedYieldPct: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0).max(100).optional()
  ),
  description: optionalText(),
});

export type ProcessDefinitionFormValues = z.input<typeof processDefinitionSchema>;

export const processDefinitionUpdateSchema = processDefinitionSchema.partial();
