import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";
import { getCurrentAppUser } from "@/lib/services/current-user";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/login");

  const roleName = user.role?.name ?? null;

  return (
    <div className="flex flex-1">
      <Sidebar roleName={roleName} />
      <div className="flex flex-1 flex-col md:pl-[240px]">
        <Topbar userName={user.fullName} roleName={roleName} />
        <main className="flex flex-1 flex-col bg-surface">{children}</main>
      </div>
    </div>
  );
}
