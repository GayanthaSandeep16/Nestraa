import { NextResponse, type NextRequest } from "next/server";
import { getSupplier } from "@/lib/services/suppliers";
import { getSupplierLedger, getSupplierOutstandingBalance } from "@/lib/services/supplier-ledger";
import { withModuleAccess } from "@/lib/auth/guard";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { logAudit } from "@/lib/services/audit";
import { SupplierStatementDocument } from "@/lib/pdf/SupplierStatementDocument";
import { renderPdfResponse } from "@/lib/pdf/render";

async function handleGET(_request: NextRequest, ctx: RouteContext<"/api/suppliers/[id]/statement/pdf">) {
  const { id } = await ctx.params;
  const supplier = await getSupplier(id);
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const [entries, outstandingBalance, user] = await Promise.all([
    getSupplierLedger(id),
    getSupplierOutstandingBalance(id),
    getCurrentAppUser(),
  ]);

  await logAudit({ tableName: "suppliers", recordId: id, action: "print_statement", changedBy: user?.id });

  const plainEntries = JSON.parse(JSON.stringify(entries));
  const plainBalance = JSON.parse(JSON.stringify(outstandingBalance));

  return renderPdfResponse(
    SupplierStatementDocument({
      supplier: { name: supplier.name, phone: supplier.phone, address: supplier.address },
      entries: plainEntries,
      outstandingBalance: plainBalance,
    }),
    `Statement-${supplier.name.replace(/\s+/g, "-")}.pdf`
  );
}

export const GET = withModuleAccess("procurement", handleGET);
