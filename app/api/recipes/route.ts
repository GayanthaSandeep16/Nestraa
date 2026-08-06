import { NextResponse, type NextRequest } from "next/server";
import { createRecipe, listRecipes } from "@/lib/services/recipes";
import { recipeSchema } from "@/lib/validation/recipes";
import { toErrorResponse } from "@/lib/api/errors";

export async function GET() {
  const recipes = await listRecipes();
  return NextResponse.json(recipes);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const recipe = await createRecipe(parsed.data);
    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
