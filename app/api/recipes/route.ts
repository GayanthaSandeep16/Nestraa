import { NextResponse, type NextRequest } from "next/server";
import { countRecipes, createRecipe, listRecipes } from "@/lib/services/recipes";
import { recipeSchema } from "@/lib/validation/recipes";
import { toErrorResponse } from "@/lib/api/errors";
import { paginate } from "@/lib/api/pagination";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET(request: NextRequest) {
  return NextResponse.json(await paginate(request, (p) => listRecipes(p), countRecipes));
}

async function handlePOST(request: NextRequest) {
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

export const GET = withModuleAccess("product-catalog", handleGET);
export const POST = withModuleAccess("product-catalog", handlePOST);
