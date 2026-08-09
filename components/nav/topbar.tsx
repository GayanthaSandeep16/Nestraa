"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, User, LogOut } from "lucide-react";
import { navItems } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";

function titleForPathname(pathname: string) {
  const match = navItems.find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.label ?? "Dashboard";
}

export function Topbar({ userName, roleName }: { userName: string; roleName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titleForPathname(pathname);
  const [query, setQuery] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      // Debounced value is a no-op for now — no search backend exists yet.
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  return (
    <header className="h-16 flex items-center justify-between gap-md px-lg border-b border-outline-variant bg-surface-container-lowest">
      <h1 className="text-headline-md text-on-surface">{title}</h1>

      <div className="flex items-center gap-md">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-64 rounded-md border border-outline-variant bg-surface-container-low pl-9 pr-sm py-xs text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        >
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-xs">
          <div className="flex items-center justify-center size-9 rounded-full bg-surface-container text-on-surface-variant">
            <User size={18} />
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-body-sm text-on-surface">{userName}</span>
            {roleName && (
              <span className="text-label-sm text-on-surface-variant capitalize">{roleName}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex items-center justify-center size-9 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
