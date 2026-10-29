import { LoginForm } from "@/components/login-form";
import { safeReturnTo } from "@/lib/auth/return-to";

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const next = Array.isArray(parameters.next) ? parameters.next[0] : parameters.next;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="grid size-12 place-items-center rounded-[var(--radius)] bg-[var(--primary)] font-bold text-[var(--primary-foreground)]">
          K
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
          Kostak Fraud Monitoring
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Enter the email and password associated with your organization account.
        </p>
        <LoginForm returnTo={safeReturnTo(next)} />
      </section>
    </main>
  );
}
