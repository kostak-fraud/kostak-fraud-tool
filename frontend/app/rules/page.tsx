import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/ui/state-panel";

export default function RulesPage() {
  return (
    <AppShell
      activePage="rules"
      pageTitle="Rules"
      pageDescription="Manage channel-scoped fraud rules and scoring. Rule creation will be added in the rules backlog."
    >
      <EmptyState
        title="No rules yet"
        description="Rule management is not connected yet. The versioned rule model and API will be delivered under RULE-001."
      />
    </AppShell>
  );
}
