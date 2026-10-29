"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { safeReturnTo } from "@/lib/auth/return-to";
import {
  getSupabasePublicConfig,
  PublicConfigurationError,
} from "@/lib/config/public-env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type LoginFormProps = {
  returnTo?: string;
};

function hasSupabaseConfiguration() {
  try {
    getSupabasePublicConfig();
    return true;
  } catch (error) {
    if (error instanceof PublicConfigurationError) return false;
    throw error;
  }
}

export function LoginForm({ returnTo = "/transactions" }: LoginFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pending, setPending] = useState(false);
  const configured = hasSupabaseConfiguration();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;

    setPending(true);
    setErrorMessage(undefined);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage("The email or password is incorrect. Check your details and try again.");
        return;
      }

      router.replace(safeReturnTo(returnTo));
      router.refresh();
    } catch (error) {
      if (error instanceof PublicConfigurationError) {
        setErrorMessage(
          "Sign-in configuration is missing. The environment settings must be completed first.",
        );
      } else {
        setErrorMessage("The sign-in service could not be reached. Please try again later.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
      {!configured && (
        <div
          className="rounded-[var(--radius)] border border-[var(--warning)] bg-amber-50 p-4 text-sm leading-6 text-amber-950"
          role="alert"
        >
          Sign-in configuration is missing. The Supabase public URL and publishable
          key must be configured.
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-base focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          disabled={pending || !configured}
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="password">
          Password
        </label>
        <input
          autoComplete="current-password"
          className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-base focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
          disabled={pending || !configured}
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {errorMessage && (
        <p className="text-sm leading-6 text-[var(--danger)]" role="alert">
          {errorMessage}
        </p>
      )}

      <Button disabled={pending || !configured} type="submit">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
