"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MODULE_KEYS, ROLE_NAMES, type ModuleKey, type RoleName } from "@/lib/auth/roles";
import { fetchJson } from "@/lib/http";

type Matrix = Record<string, ModuleKey[]>;

const editableRoles = ROLE_NAMES.filter((r) => r !== "admin");
const editableModules = MODULE_KEYS.filter((m) => m !== "admin");

export function AccessMatrixPanel() {
  const [matrix, setMatrix] = useState<Matrix>({});
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return fetchJson<Matrix>("/api/admin/access").then((data) => {
      setMatrix(data ?? {});
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(role: RoleName, mod: ModuleKey) {
    setMatrix((prev) => {
      const current = new Set(prev[role] ?? []);
      if (current.has(mod)) current.delete(mod);
      else current.add(mod);
      return { ...prev, [role]: [...current] };
    });
  }

  async function save(role: RoleName) {
    setError(null);
    setSavingRole(role);
    const res = await fetch("/api/admin/access", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleName: role, moduleKeys: matrix[role] ?? [] }),
    });
    setSavingRole(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof data?.error === "string" ? data.error : "Could not save access.");
      return;
    }
    await load();
  }

  if (loading) return <p className="text-body-md text-on-surface-variant">Loading access matrix…</p>;

  return (
    <div className="flex flex-col gap-md">
      <p className="text-body-md text-on-surface-variant">
        Which modules each role can open. The <span className="font-medium">admin</span> role always has full access.
      </p>
      {error && <p className="text-body-sm text-error">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-outline-variant">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-md py-sm text-label-sm uppercase text-on-surface-variant">Role</th>
              {editableModules.map((m) => (
                <th key={m} className="px-sm py-sm text-label-sm text-on-surface-variant">
                  {m}
                </th>
              ))}
              <th className="px-md py-sm" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-outline-variant text-body-md text-on-surface">
              <td className="px-md py-sm font-medium">admin</td>
              {editableModules.map((m) => (
                <td key={m} className="px-sm py-sm text-center">
                  <input type="checkbox" checked readOnly disabled />
                </td>
              ))}
              <td className="px-md py-sm text-right text-body-sm text-on-surface-variant">full access</td>
            </tr>
            {editableRoles.map((role) => (
              <tr key={role} className="border-t border-outline-variant text-body-md text-on-surface">
                <td className="px-md py-sm font-medium">{role}</td>
                {editableModules.map((m) => (
                  <td key={m} className="px-sm py-sm text-center">
                    <input
                      type="checkbox"
                      checked={(matrix[role] ?? []).includes(m)}
                      onChange={() => toggle(role, m)}
                    />
                  </td>
                ))}
                <td className="px-md py-sm text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={savingRole === role}
                    onClick={() => save(role)}
                  >
                    {savingRole === role ? "Saving…" : "Save"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
