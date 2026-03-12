"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

/**
 * Subscribe to lp_task_messages changes via Supabase Realtime.
 * Calls `onChange` whenever messages are inserted or updated.
 * Replaces HTTP polling for unread counts.
 */
export function useRealtimeMessages(channelKey: string, onChange: () => void) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`rt-msg-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lp_task_messages" },
        () => cbRef.current()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [channelKey]);
}
