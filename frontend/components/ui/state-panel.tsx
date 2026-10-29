"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";

type StatePanelKind = "empty" | "loading" | "error" | "forbidden";

type StatePanelProps = {
  kind: StatePanelKind;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

type StatePanelContentProps = Omit<StatePanelProps, "kind">;

export function StatePanel({
  kind,
  title,
  description,
  actionLabel,
  onAction,
}: StatePanelProps) {
  const headingId = useId();
  const role = kind === "error" || kind === "forbidden" ? "alert" : "status";

  return (
    <section
      aria-labelledby={headingId}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className="flex min-h-36 flex-col justify-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      role={role}
    >
      {kind === "loading" && (
        <div aria-hidden="true" className="mb-1 grid gap-3">
          <span className="h-3 w-1/3 animate-pulse rounded bg-[var(--surface-muted)]" />
          <span className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-muted)]" />
          <span className="h-3 w-1/2 animate-pulse rounded bg-[var(--surface-muted)]" />
        </div>
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
          {kind === "empty"
            ? "No data"
            : kind === "loading"
              ? "Loading"
              : kind === "error"
                ? "Unable to load"
                : "Access restricted"}
        </p>
        <h2 className="mt-1 text-base font-semibold text-[var(--text-primary)]" id={headingId}>
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      {actionLabel && onAction && (
        <div>
          <Button onClick={onAction} type="button" variant="outline">
            {actionLabel}
          </Button>
        </div>
      )}
    </section>
  );
}

export function EmptyState(props: StatePanelContentProps) {
  return <StatePanel {...props} kind="empty" />;
}

export function LoadingState(props: StatePanelContentProps) {
  return <StatePanel {...props} kind="loading" />;
}

export function ErrorState(props: StatePanelContentProps) {
  return <StatePanel {...props} kind="error" />;
}

export function ForbiddenState(props: StatePanelContentProps) {
  return <StatePanel {...props} kind="forbidden" />;
}
