"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (data.session) {
      router.replace("/");
      router.refresh();
      return;
    }

    // Email confirmation is required before a session is issued.
    setMessage("Account created — check your email to confirm it, then sign in.");
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[24rem] rounded-lg border border-outline-variant bg-surface-container-lowest p-lg"
    >
      <span className="font-mono text-label-sm uppercase tracking-[0.15em] text-tertiary">
        New entry
      </span>
      <h1 className="text-headline-md text-on-surface mt-xs mb-lg">Create your Nestraa account</h1>

      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="text-label-md text-on-surface-variant">Full name</span>
          <Input
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-body-sm text-error">{error}</p>}
        {message && <p className="text-body-sm text-on-surface-variant">{message}</p>}

        <Button type="submit" disabled={submitting} className="mt-sm w-full justify-center">
          {submitting ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-body-sm text-on-surface-variant text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
