import { AppShell } from "@/components/app-shell";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from "@/components/ui/state-panel";

export default function UiPreviewPage() {
  return (
    <AppShell
      activePage={null}
      pageTitle="Component states"
      pageDescription="A small visual reference for the loading, empty, error, and permission states shared across product screens."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <EmptyState
          title="No matching transactions"
          description="Try changing the channel or clearing a filter to see more results."
        />
        <LoadingState
          title="Loading transactions"
          description="Transaction rows will appear when the request completes."
        />
        <ErrorState
          title="Transactions could not be loaded"
          description="The service may be temporarily unavailable. Retry after checking the connection."
        />
        <ForbiddenState
          title="You do not have access to Rules"
          description="Your assigned role does not allow access to this area. Contact an administrator if you need access."
        />
      </div>
    </AppShell>
  );
}
