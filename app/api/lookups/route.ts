import { NextResponse } from "next/server";
import {
  listCategories,
  listPackageSizes,
  listUnitsOfMeasure,
  listWarehouses,
} from "@/lib/services/lookups";
import { withModuleAccess } from "@/lib/auth/guard";

async function handleGET() {
  const [unitsOfMeasure, categories, warehouses, packageSizes] = await Promise.all([
    listUnitsOfMeasure(),
    listCategories(),
    listWarehouses(),
    listPackageSizes(),
  ]);
  return NextResponse.json({ unitsOfMeasure, categories, warehouses, packageSizes });
}

// Shared reference data used across modules — any authenticated user can read it.
export const GET = withModuleAccess("dashboard", handleGET);
