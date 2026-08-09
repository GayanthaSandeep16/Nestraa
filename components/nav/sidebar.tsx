"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, type NavGroup } from "@/lib/nav";
import { canAccessModule } from "@/lib/auth/roles";

const groupOrder: NavGroup[] = ["Setup", "Operations"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ roleName }: { roleName: string | null }) {
  const pathname = usePathname();
  const allowedItems = navItems.filter((item) => canAccessModule(roleName, item.moduleKey));
  const dashboardItem = allowedItems.find((item) => !item.group);

  return (
    <aside className="hidden md:flex w-[240px] fixed inset-y-0 left-0 flex-col border-r border-outline-variant bg-surface-container-low">
      <div className="flex items-center h-16 px-lg border-b border-outline-variant">
        <span className="text-headline-md text-on-surface">Nestraa</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-md px-sm">
        {dashboardItem && (
          <NavLink item={dashboardItem} active={isActive(pathname, dashboardItem.href)} />
        )}

        {groupOrder.map((group) => {
          const items = allowedItems.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="mt-lg">
              <div className="px-sm mb-xs text-label-sm text-on-surface-variant uppercase">
                {group}
              </div>
              <div className="flex flex-col gap-xs">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-sm px-sm py-xs rounded-md text-body-md transition-colors ${
        active
          ? "bg-primary-fixed text-on-primary-fixed"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
      <span>{item.label}</span>
    </Link>
  );
}
