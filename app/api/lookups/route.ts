import { NextResponse } from "next/server";
import { listCategories, listUnitsOfMeasure } from "@/lib/services/lookups";

export async function GET() {
  const [unitsOfMeasure, categories] = await Promise.all([listUnitsOfMeasure(), listCategories()]);
  return NextResponse.json({ unitsOfMeasure, categories });
}
