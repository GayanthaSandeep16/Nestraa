import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/services/current-user";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const user = await getCurrentAppUser();
  if (user?.role?.name !== "admin") redirect("/");

  return <AdminTabs currentUserId={user.id} />;
}
