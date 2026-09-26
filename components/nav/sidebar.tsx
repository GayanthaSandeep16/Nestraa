"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navItems, type NavGroup } from "@/lib/nav";

const groupOrder: NavGroup[] = ["Setup", "Operations", "Admin"];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ allowedModuleKeys }: { allowedModuleKeys: string[] }) {
  const pathname = usePathname();
  const allowedItems = navItems.filter((item) => allowedModuleKeys.includes(item.moduleKey));
  const dashboardItem = allowedItems.find((item) => !item.group);
  // Below md the sidebar is an overlay drawer opened from the hamburger;
  // any link click closes it.
  const [open, setOpen] = useState(false);

  return (
    <>
    <button
      type="button"
      aria-label="Open menu"
      onClick={() => setOpen(true)}
      className="md:hidden fixed top-3 left-3 z-30 flex items-center justify-center size-10 rounded-md text-on-surface hover:bg-surface-container"
    >
      <Menu size={20} />
    </button>
    {open && <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />}
    <aside className={`${open ? "flex" : "hidden"} md:flex z-50 w-[240px] fixed inset-y-0 left-0 flex-col border-r border-outline-variant bg-surface-container-low`}>
      <div className="flex items-center justify-between h-16 px-lg border-b border-outline-variant">
        <span className="text-headline-md text-on-surface">Nestraa</span>
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="md:hidden text-on-surface-variant">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-md px-sm" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
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
    </>
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
