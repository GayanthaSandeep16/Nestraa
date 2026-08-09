"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[24rem] rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
    >
      <span className="font-mono text-label-sm uppercase tracking-[0.15em] text-tertiary">
        Access log
      </span>
      <h1 className="text-headline-md text-on-surface mt-xs mb-lg">Sign in to Nestraa</h1>

      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="text-label-md text-on-surface-variant">Email</span>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-xs">
          <span className="text-label-md text-on-surface-variant">Password</span>
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-body-sm text-error">{error}</p>}

        <Button type="submit" disabled={submitting} className="mt-sm w-full justify-center">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>

        <p className="text-body-sm text-on-surface-variant text-center">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </form>
  );
}
