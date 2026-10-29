"use client";

import { useState } from "react";

import { EmptyState } from "@/components/ui/state-panel";

const channels = [
  { id: "wallet", label: "Wallet" },
  { id: "pos", label: "POS" },
  { id: "physical-pos", label: "Physical POS" },
] as const;

type ChannelId = (typeof channels)[number]["id"];

type ChannelTabsProps = {
  initialChannel?: ChannelId;
};

export function ChannelTabs({ initialChannel = "wallet" }: ChannelTabsProps) {
  const [selectedChannel, setSelectedChannel] = useState<ChannelId>(initialChannel);
  const activeChannel = channels.find((channel) => channel.id === selectedChannel) ?? channels[0];

  return (
    <div className="space-y-4">
      <div
        aria-label="Transaction channels"
        className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1"
        role="tablist"
      >
        {channels.map((channel) => {
          const selected = channel.id === selectedChannel;

          return (
            <button
              aria-controls={`channel-panel-${channel.id}`}
              aria-selected={selected}
              className={[
                "min-h-11 shrink-0 rounded-md px-4 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
                selected
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
              ].join(" ")}
              id={`channel-tab-${channel.id}`}
              key={channel.id}
              onClick={() => setSelectedChannel(channel.id)}
              role="tab"
              type="button"
            >
              {channel.label}
            </button>
          );
        })}
      </div>

      <section
        aria-labelledby={`channel-tab-${selectedChannel}`}
        className="min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
        id={`channel-panel-${selectedChannel}`}
        role="tabpanel"
        tabIndex={0}
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Payment channel
          </p>
          <h2 className="mt-1 text-lg font-semibold">{activeChannel.label} transactions</h2>
        </div>
        <EmptyState
          title={`No ${activeChannel.label} transactions yet`}
          description="Synthetic transactions will appear here when the generator is delivered in TX-002."
        />
      </section>
    </div>
  );
}
