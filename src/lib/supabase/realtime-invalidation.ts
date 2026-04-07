import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type RealtimeCallback = () => void;
type RealtimeClientLike = Pick<SupabaseClient, "channel" | "removeChannel">;

export function createRealtimeChannelName(table: string, scope?: string) {
  const suffix = scope ? `:${scope}` : "";
  return `harmoniq:${table}${suffix}`;
}

export function subscribeToRealtimeInvalidation({
  client,
  table,
  onInvalidate,
  filter,
  scope,
}: {
  client: RealtimeClientLike;
  table: string;
  onInvalidate: RealtimeCallback;
  filter?: string;
  scope?: string;
}) {
  const channel = client
    .channel(createRealtimeChannelName(table, scope))
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      onInvalidate
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel as RealtimeChannel);
  };
}
