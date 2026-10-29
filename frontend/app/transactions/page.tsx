import { AuthenticatedWorkspace } from "@/components/authenticated-workspace";
import { ChannelTabs } from "@/components/channel-tabs";
import { requireVerifiedSession } from "@/lib/auth/require-session";

export default async function TransactionsPage() {
  await requireVerifiedSession("/transactions");

  return (
    <AuthenticatedWorkspace
      activePage="transactions"
      pageTitle="Transactions"
      pageDescription="Review payment activity by channel. The transaction feed will connect to the API in the next implementation slice."
      returnTo="/transactions"
    >
      <ChannelTabs />
    </AuthenticatedWorkspace>
  );
}
