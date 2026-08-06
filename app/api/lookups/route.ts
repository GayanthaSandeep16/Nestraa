import { NextResponse } from "next/server";
import { listCategories, listUnitsOfMeasure, listWarehouses } from "@/lib/services/lookups";

export async function GET() {
  const [unitsOfMeasure, categories, warehouses] = await Promise.all([
    listUnitsOfMeasure(),
    listCategories(),
    listWarehouses(),
  ]);
  return NextResponse.json({ unitsOfMeasure, categories, warehouses });
}
