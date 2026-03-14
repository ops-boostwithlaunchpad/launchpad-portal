"use client";

import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

export function useRealtimeClientMessages(channelKey: string, onChange: () => void) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`rt-client-msg-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lp_client_messages" },
        () => cbRef.current()
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [channelKey]);
}
