import { ConsignmentTabs } from "@/components/consignment/consignment-tabs";
import { FieldApp } from "@/components/consignment/mobile/field-app";
import { getCurrentAppUser } from "@/lib/services/current-user";

// Sales reps operate mostly from a phone in the field, so they get the
// dedicated mobile-first flow instead of the desktop tabs/tables — everyone
// else (admin/sales) gets the full desktop view with the KPI dashboard.
export default async function ConsignmentsPage() {
  const user = await getCurrentAppUser();
  const isSalesRep = user?.role?.name === "sales_rep";

  if (isSalesRep && user) {
    return <FieldApp currentUserId={user.id} currentUserName={user.fullName} />;
  }

  return (
    <div className="flex flex-col gap-lg p-lg">
      <h1 className="text-headline-lg text-on-surface">Consignments</h1>
      <ConsignmentTabs />
    </div>
  );
}
