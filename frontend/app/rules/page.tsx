import { AuthenticatedWorkspace } from "@/components/authenticated-workspace";
import { EmptyState } from "@/components/ui/state-panel";
import { requireVerifiedSession } from "@/lib/auth/require-session";

export default async function RulesPage() {
  await requireVerifiedSession("/rules");

  return (
    <AuthenticatedWorkspace
      activePage="rules"
      pageTitle="Rules"
      pageDescription="Manage channel-scoped fraud rules and scoring. Rule creation will be added in the rules backlog."
      returnTo="/rules"
    >
      <EmptyState
        title="No rules yet"
        description="Rule management is not connected yet. The versioned rule model and API will be delivered under RULE-001."
      />
    </AuthenticatedWorkspace>
  );
}
