"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ErrorState, ForbiddenState, LoadingState } from "@/components/ui/state-panel";
import { ApiError, createAuthenticatedApiClient } from "@/lib/api/client";
import { getCurrentIdentity, type IdentityContext } from "@/lib/api/identity";
import { loginPathFor } from "@/lib/auth/return-to";
import { PublicConfigurationError } from "@/lib/config/public-env";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type NavigationKey = "transactions" | "rules";

const requiredPermissionByPage: Record<NavigationKey, string> = {
  transactions: "transactions.read",
  rules: "rules.read",
};

type AuthenticatedWorkspaceProps = {
  activePage: NavigationKey;
  pageTitle: string;
  pageDescription: string;
  returnTo: string;
  children: ReactNode;
};

type WorkspaceState =
  | { kind: "loading" }
  | { kind: "ready"; identity: IdentityContext }
  | { kind: "forbidden" }
  | { kind: "configuration" }
  | { kind: "error" };

export function AuthenticatedWorkspace({
  activePage,
  pageTitle,
  pageDescription,
  returnTo,
  children,
}: AuthenticatedWorkspaceProps) {
  const router = useRouter();
  const [state, setState] = useState<WorkspaceState>({ kind: "loading" });
  const [loggingOut, setLoggingOut] = useState(false);

  const redirectToLogin = useCallback(() => {
    router.replace(loginPathFor(returnTo));
    router.refresh();
  }, [returnTo, router]);

  const loadIdentity = useCallback(async () => {
    await Promise.resolve();

    try {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        redirectToLogin();
        return;
      }

      const api = createAuthenticatedApiClient({
        supabase,
        onUnauthorized: redirectToLogin,
      });
      const identity = await getCurrentIdentity(api);
      setState({ kind: "ready", identity });
    } catch (error) {
      if (error instanceof PublicConfigurationError) {
        setState({ kind: "configuration" });
      } else if (error instanceof ApiError && error.status === 403) {
        setState({ kind: "forbidden" });
      } else if (!(error instanceof ApiError && error.status === 401)) {
        setState({ kind: "error" });
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadIdentity(), 0);
    return () => window.clearTimeout(task);
  }, [loadIdentity]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-xl">
          <LoadingState
            title="Verifying your session"
            description="Your workspace and tenant membership are loading securely."
          />
        </div>
      </main>
    );
  }

  if (state.kind === "configuration") {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="w-full max-w-xl">
          <ErrorState
            title="Application configuration is missing"
            description="The workspace cannot load until the Supabase and API public environment settings are complete."
          />
        </div>
      </main>
    );
  }

  if (state.kind === "forbidden") {
    return (
      <AppShell
        activePage={activePage}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        navigationPermissions={[]}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      >
        <ForbiddenState
          title="Tenant membership unavailable"
          description="Your authentication session is active, but the backend could not resolve one active tenant membership or the required permission. Contact your administrator."
        />
      </AppShell>
    );
  }

  if (state.kind === "error") {
    return (
      <AppShell
        activePage={activePage}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      >
        <ErrorState
          title="Identity could not be loaded"
          description="The backend service could not be reached or returned an unexpected response. Your session remains active."
          actionLabel="Try again"
          onAction={() => {
            setState({ kind: "loading" });
            void loadIdentity();
          }}
        />
      </AppShell>
    );
  }

  const requiredPermission = requiredPermissionByPage[activePage];
  if (!state.identity.permissions.includes(requiredPermission)) {
    return (
      <AppShell
        activePage={activePage}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        identity={state.identity}
        navigationPermissions={state.identity.permissions}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      >
        <ForbiddenState
          title={`You do not have access to ${pageTitle}`}
          description="Your session is active, but your current tenant permissions do not allow this page. Contact your administrator if you need access."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      activePage={activePage}
      pageTitle={pageTitle}
      pageDescription={pageDescription}
      identity={state.identity}
      navigationPermissions={state.identity.permissions}
      onLogout={handleLogout}
      loggingOut={loggingOut}
    >
      {children}
    </AppShell>
  );
}
