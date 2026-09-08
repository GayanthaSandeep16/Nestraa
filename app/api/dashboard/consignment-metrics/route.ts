import { NextResponse } from "next/server";
import { getConsignmentDashboardMetrics } from "@/lib/services/consignment-dashboard";
import { AuthError, requireModuleAccess } from "@/lib/auth/guard";

// Company-wide collections/consignment/returns totals — narrower than a
// sales rep's own "my retailers" view, so restrict to admin/sales (the
// module-level "consignment" access also includes sales_rep, hence the
// extra role check here rather than a new module key).
async function handleGET() {
  try {
    const user = await requireModuleAccess("consignment");
    if (user.role?.name === "sales_rep") {
      throw new AuthError(403, "This dashboard is not available to sales representatives");
    }
    const metrics = await getConsignmentDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export const GET = handleGET;
