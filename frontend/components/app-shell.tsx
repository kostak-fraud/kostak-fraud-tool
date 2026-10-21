import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const navigation = [
  { label: "Overview", href: "#foundation-overview", active: true },
  { label: "Transactions", href: "#planned-areas", active: false },
  { label: "Rules", href: "#planned-areas", active: false },
];

export function AppShell() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        aria-label="Application sidebar"
        className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-6 lg:min-h-screen lg:border-b-0 lg:border-r"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-[var(--radius)] bg-[var(--primary)] text-[var(--primary-foreground)]">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Kostak</p>
            <p className="text-sm text-[var(--text-secondary)]">Fraud Tool</p>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="mt-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Workspace
          </p>
          <ul className="grid gap-2">
            {navigation.map((item) => (
              <li key={item.label}>
                <a
                  aria-current={item.active ? "page" : undefined}
                  className="flex min-h-11 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] aria-[current=page]:bg-[var(--surface-muted)] aria-[current=page]:text-[var(--primary)]"
                  href={item.href}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
        <div className="mx-auto max-w-5xl">
          <header className="border-b border-[var(--border)] pb-8">
            <p className="text-sm font-semibold text-[var(--primary)]">Foundation scaffold</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              The application shell is ready for the product modules that will be delivered in later tickets.
            </p>
          </header>

          <section
            aria-labelledby="foundation-heading"
            className="mt-8 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8"
            id="foundation-overview"
          >
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-semibold text-[var(--success)]">Scaffold ready</p>
                <h2 className="mt-2 text-xl font-semibold" id="foundation-heading">
                  A neutral starting point
                </h2>
                <p className="mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">
                  Navigation, layout, theme tokens, and accessible focus states are in place. No fraud workflow is simulated on this page.
                </p>
              </div>
              <Button asChild variant="outline">
                <a href="#planned-areas">View planned areas</a>
              </Button>
            </div>
          </section>

          <section aria-labelledby="planned-heading" className="mt-8" id="planned-areas">
            <h2 className="text-lg font-semibold" id="planned-heading">
              Planned product areas
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Transactions and rules will be implemented by their dedicated backlog tickets.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
