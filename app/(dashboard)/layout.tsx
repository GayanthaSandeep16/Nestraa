import { Sidebar } from "@/components/nav/sidebar";
import { Topbar } from "@/components/nav/topbar";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-[240px]">
        <Topbar />
        <main className="flex flex-1 flex-col bg-surface">{children}</main>
      </div>
    </div>
  );
}
