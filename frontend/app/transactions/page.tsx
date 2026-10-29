import { AppShell } from "@/components/app-shell";
import { ChannelTabs } from "@/components/channel-tabs";

export default function TransactionsPage() {
  return (
    <AppShell
      activePage="transactions"
      pageTitle="Transactions"
      pageDescription="Review payment activity by channel. The transaction feed will connect to the API in the next implementation slice."
    >
      <ChannelTabs />
    </AppShell>
  );
}
