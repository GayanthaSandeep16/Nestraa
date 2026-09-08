import { NextResponse } from "next/server";
import {
  listCategories,
  listFinishedGoods,
  listPackageSizes,
  listSalesReps,
  listUnitsOfMeasure,
  listWarehouses,
} from "@/lib/services/lookups";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const [unitsOfMeasure, categories, warehouses, packageSizes, finishedGoods, salesReps] = await Promise.all([
    listUnitsOfMeasure(),
    listCategories(),
    listWarehouses(),
    listPackageSizes(),
    listFinishedGoods(),
    listSalesReps(),
  ]);
  return NextResponse.json({ unitsOfMeasure, categories, warehouses, packageSizes, finishedGoods, salesReps });
}

// Shared reference data used across modules — any authenticated user can read it.
export const GET = withModuleAccess("dashboard", handleGET);
