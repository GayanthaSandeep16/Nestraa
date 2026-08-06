import { z } from "zod";

const recipeIngredientSchema = z
  .object({
    materialId: z.string().uuid("Material is required"),
    uomId: z.string().uuid("Unit of measure is required"),
    percentage: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce.number().min(0).max(100).optional()
    ),
    fixedQuantity: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? undefined : value),
      z.coerce.number().min(0).optional()
    ),
  })
  .refine((value) => (value.percentage !== undefined) !== (value.fixedQuantity !== undefined), {
    message: "Set either a percentage or a fixed quantity, not both",
    path: ["percentage"],
  });

export const recipeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  outputMaterialId: z.string().uuid("Output product is required"),
  version: z.coerce.number().int().min(1).optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
});

export type RecipeFormValues = z.input<typeof recipeSchema>;

export const recipeUpdateSchema = recipeSchema.partial().extend({
  isActive: z.boolean().optional(),
});
