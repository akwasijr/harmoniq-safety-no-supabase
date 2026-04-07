import { describe, expect, it, vi } from "vitest";
import {
  createRealtimeChannelName,
  subscribeToRealtimeInvalidation,
} from "@/lib/supabase/realtime-invalidation";

describe("createRealtimeChannelName", () => {
  it("builds a stable channel name without scope", () => {
    expect(createRealtimeChannelName("incidents")).toBe("harmoniq:incidents");
  });

  it("adds the scope suffix when provided", () => {
    expect(createRealtimeChannelName("incidents", "harmoniq_incidents")).toBe(
      "harmoniq:incidents:harmoniq_incidents"
    );
  });
});

describe("subscribeToRealtimeInvalidation", () => {
  it("subscribes to postgres changes and forwards invalidation events", () => {
    const onInvalidate = vi.fn();
    let capturedCallback: (() => void) | undefined;

    const channel = {
      on: vi.fn((_type, _filter, callback: () => void) => {
        capturedCallback = callback;
        return channel;
      }),
      subscribe: vi.fn(() => channel),
    };

    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    subscribeToRealtimeInvalidation({
      client,
      table: "incidents",
      scope: "harmoniq_incidents",
      onInvalidate,
      filter: "company_id=eq.comp-1",
    });

    expect(client.channel).toHaveBeenCalledWith("harmoniq:incidents:harmoniq_incidents");
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "incidents",
        filter: "company_id=eq.comp-1",
      },
      onInvalidate
    );

    capturedCallback?.();
    expect(onInvalidate).toHaveBeenCalledTimes(1);
  });

  it("removes the channel on cleanup", () => {
    const channel = {
      on: vi.fn(() => channel),
      subscribe: vi.fn(() => channel),
    };

    const client = {
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    };

    const unsubscribe = subscribeToRealtimeInvalidation({
      client,
      table: "work_orders",
      onInvalidate: vi.fn(),
    });

    unsubscribe();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
  });
});
