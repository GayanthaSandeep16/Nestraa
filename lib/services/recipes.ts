import { prisma } from "@/lib/db/prisma";

export function listRecipes(opts?: { skip?: number; take?: number }) {
  return prisma.recipe.findMany({
    include: { outputMaterial: true, ingredients: { include: { material: true, uom: true } } },
    orderBy: { name: "asc" },
    ...opts,
  });
}

export function countRecipes() {
  return prisma.recipe.count();
}

export function getRecipe(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: {
      outputMaterial: true,
      ingredients: { include: { material: true, uom: true } },
    },
  });
}

export interface RecipeIngredientInput {
  materialId: string;
  uomId: string;
  percentage?: number | null;
  fixedQuantity?: number | null;
}

export interface RecipeInput {
  name: string;
  outputMaterialId: string;
  version?: number;
  ingredients: RecipeIngredientInput[];
}

export function createRecipe(data: RecipeInput) {
  const { ingredients, ...header } = data;
  return prisma.recipe.create({
    data: {
      ...header,
      ingredients: { create: ingredients },
    },
    include: { outputMaterial: true, ingredients: { include: { material: true, uom: true } } },
  });
}

export function updateRecipe(
  id: string,
  data: Partial<Omit<RecipeInput, "ingredients">> & { ingredients?: RecipeIngredientInput[]; isActive?: boolean }
) {
  const { ingredients, ...header } = data;
  return prisma.$transaction(async (tx) => {
    if (ingredients) {
      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }
    return tx.recipe.update({
      where: { id },
      data: {
        ...header,
        ...(ingredients ? { ingredients: { create: ingredients } } : {}),
      },
      include: { outputMaterial: true, ingredients: { include: { material: true, uom: true } } },
    });
  });
}

export function deleteRecipe(id: string) {
  return prisma.recipe.delete({ where: { id } });
}
