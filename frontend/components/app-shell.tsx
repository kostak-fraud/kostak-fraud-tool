"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import type { IdentityContext } from "@/lib/api/identity";

const navigation = [
  {
    key: "transactions",
    label: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    permission: "transactions.read",
  },
  {
    key: "rules",
    label: "Rules",
    href: "/rules",
    icon: BookOpen,
    permission: "rules.read",
  },
] as const;

type NavigationKey = (typeof navigation)[number]["key"];

type AppShellProps = {
  activePage?: NavigationKey | null;
  pageTitle: string;
  pageDescription: string;
  children: ReactNode;
  identity?: IdentityContext;
  navigationPermissions?: readonly string[];
  onLogout?: () => void;
  loggingOut?: boolean;
};

export function AppShell({
  activePage = "transactions",
  pageTitle,
  pageDescription,
  children,
  identity,
  navigationPermissions,
  onLogout,
  loggingOut = false,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleNavigation = navigation.filter(
    (item) => !navigationPermissions || navigationPermissions.includes(item.permission),
  );

  return (
    <div
      className={
        collapsed
          ? "min-h-screen lg:grid lg:grid-cols-[76px_minmax(0,1fr)]"
          : "min-h-screen lg:grid lg:grid-cols-[264px_minmax(0,1fr)]"
      }
    >
      <a
        className="sr-only z-50 rounded-md bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to main content
      </a>

      <aside
        aria-label="Application sidebar"
        className={[
          "flex flex-col border-b border-[var(--border)] bg-[var(--surface)] py-5 lg:min-h-screen lg:border-b-0 lg:border-r",
          collapsed ? "px-3" : "px-5",
        ].join(" ")}
      >
        <div className={["flex min-h-11 items-center gap-3", collapsed ? "justify-center" : ""].join(" ")}>
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-foreground)]">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          {!collapsed && (
            <div>
              <p className="font-semibold leading-5">Kostak</p>
              <p className="text-sm text-[var(--text-secondary)]">Fraud Monitoring</p>
            </div>
          )}
        </div>

        <div
          className={[
            "mt-8 flex min-h-11 items-center",
            collapsed ? "justify-center" : "justify-between",
          ].join(" ")}
        >
          {!collapsed && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Workspace
            </p>
          )}
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="primary-navigation"
            className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
            onClick={() => setCollapsed((current) => !current)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            {collapsed ? (
              <ChevronRight aria-hidden="true" className="size-5" />
            ) : (
              <ChevronLeft aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>

        <nav aria-label="Primary navigation" className="mt-3" id="primary-navigation">
          <ul className="grid gap-1.5">
            {visibleNavigation.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.key;

              return (
                <li key={item.key}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={[
                      "flex min-h-11 items-center gap-3 rounded-[var(--radius)] px-3 text-sm font-medium transition-colors",
                      "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                      active
                        ? "bg-[var(--surface-muted)] text-[var(--primary)]"
                        : "",
                      collapsed ? "justify-center px-0" : "",
                    ].join(" ")}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon aria-hidden="true" className="size-5 shrink-0" />
                    <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-5 border-t border-[var(--border)] pt-5 lg:mt-auto">
          {!collapsed && identity && (
            <div className="mb-4 text-xs leading-5 text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">{identity.tenantName}</p>
              <p>{identity.roles.join(", ") || "Assigned member"}</p>
            </div>
          )}
          {onLogout && (
            <button
              aria-label="Log out"
              className={[
                "flex min-h-11 w-full items-center gap-3 rounded-[var(--radius)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                collapsed ? "justify-center px-0" : "",
              ].join(" ")}
              disabled={loggingOut}
              onClick={onLogout}
              title={collapsed ? "Log out" : undefined}
              type="button"
            >
              <LogOut aria-hidden="true" className="size-5 shrink-0" />
              <span className={collapsed ? "sr-only" : ""}>
                {loggingOut ? "Logging out…" : "Log out"}
              </span>
            </button>
          )}
        </div>
      </aside>

      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-10 lg:py-8" id="main-content">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-6 border-b border-[var(--border)] pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Workspace / {pageTitle}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{pageTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              {pageDescription}
            </p>
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
