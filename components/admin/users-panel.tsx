"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ROLE_NAMES } from "@/lib/auth/roles";
import { fetchJson } from "@/lib/http";

interface AppUserRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: { name: string } | null;
}

export function UsersPanel({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  function loadUsers() {
    return fetchJson<AppUserRow[]>("/api/admin/users").then((data) => {
      setUsers(data ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setError(null);
    setSavingId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingId(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof data?.error === "string" ? data.error : "Could not update user.");
      return;
    }
    await loadUsers();
  }

  const columns: DataTableColumn<AppUserRow>[] = [
    { key: "name", header: "Name", render: (u) => <span className="font-medium">{u.fullName}</span> },
    { key: "email", header: "Email", render: (u) => u.email },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Select
          value={u.role?.name ?? ""}
          disabled={u.id === currentUserId || savingId === u.id}
          onChange={(e) => patchUser(u.id, { roleName: e.target.value || null })}
          className="w-40"
        >
          <option value="">— none —</option>
          {ROLE_NAMES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <StatusBadge label={u.isActive ? "Active" : "Inactive"} tone={u.isActive ? "success" : "neutral"} />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) => (
        <Button
          type="button"
          variant="secondary"
          disabled={u.id === currentUserId || savingId === u.id}
          onClick={() => patchUser(u.id, { isActive: !u.isActive })}
        >
          {u.isActive ? "Deactivate" : "Activate"}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-md">
      <p className="text-body-md text-on-surface-variant">
        {loading ? "Loading users…" : `${users.length} user${users.length === 1 ? "" : "s"}`}
      </p>
      {error && <p className="text-body-sm text-error">{error}</p>}
      <DataTable columns={columns} rows={users} getRowKey={(u) => u.id} emptyMessage="No users yet." />
    </div>
  );
}
