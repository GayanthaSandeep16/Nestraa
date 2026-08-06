import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const [materialCount, roleCount] = await Promise.all([
    prisma.material.count(),
    prisma.role.count(),
  ]);

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-surface p-xl">
      <main className="flex w-full max-w-lg flex-col gap-md rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
        <h1 className="font-display text-display text-on-surface">
          Nestraa
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Foundation is wired up: Next.js, Tailwind design tokens, Prisma, and
          Supabase.
        </p>

        <dl className="flex flex-col gap-sm text-body-sm">
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
            <dt className="text-on-surface-variant">Database (Prisma)</dt>
            <dd className="font-mono text-on-surface">connected</dd>
          </div>
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
            <dt className="text-on-surface-variant">Materials</dt>
            <dd className="font-mono text-on-surface">{materialCount}</dd>
          </div>
          <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
            <dt className="text-on-surface-variant">Roles</dt>
            <dd className="font-mono text-on-surface">{roleCount}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-on-surface-variant">Supabase session</dt>
            <dd className="font-mono text-on-surface">
              {session ? "signed in" : "none"}
            </dd>
          </div>
        </dl>
      </main>
    </div>
  );
}
