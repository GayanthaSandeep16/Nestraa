"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { UsersPanel } from "@/components/admin/users-panel";
import { AccessMatrixPanel } from "@/components/admin/access-matrix-panel";
import { SalesRepsPanel } from "@/components/admin/sales-reps-panel";

type Tab = "users" | "access" | "reps";

const tabs: { id: Tab; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "access", label: "Access" },
  { id: "reps", label: "Sales Reps" },
];

export function AdminTabs({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const panels: Record<Tab, ReactNode> = {
    users: <UsersPanel currentUserId={currentUserId} />,
    access: <AccessMatrixPanel />,
    reps: <SalesRepsPanel />,
  };

  return (
    <div className="flex flex-col gap-lg p-lg">
      <div className="flex gap-sm border-b border-outline-variant">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-md py-sm text-body-md font-medium",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panels[activeTab]}
    </div>
  );
}
