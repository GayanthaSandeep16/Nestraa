import { NextResponse } from "next/server";
import {
  listCategories,
  listPackageSizes,
  listUnitsOfMeasure,
  listWarehouses,
} from "@/lib/services/lookups";

export async function GET() {
  const [unitsOfMeasure, categories, warehouses, packageSizes] = await Promise.all([
    listUnitsOfMeasure(),
    listCategories(),
    listWarehouses(),
    listPackageSizes(),
  ]);
  return NextResponse.json({ unitsOfMeasure, categories, warehouses, packageSizes });
}
