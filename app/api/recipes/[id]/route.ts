import { NextResponse, type NextRequest } from "next/server";
import { deleteRecipe, updateRecipe } from "@/lib/services/recipes";
import { recipeUpdateSchema } from "@/lib/validation/recipes";
import { toErrorResponse } from "@/lib/api/errors";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = recipeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const recipe = await updateRecipe(id, parsed.data);
    return NextResponse.json(recipe);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/recipes/[id]">) {
  const { id } = await ctx.params;
  await deleteRecipe(id);
  return new NextResponse(null, { status: 204 });
}
