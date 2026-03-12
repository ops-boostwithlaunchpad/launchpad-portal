"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getSupabase } from "./supabase";
import { useAuth } from "./AuthContext";

const PresenceContext = createContext<Record<number, boolean>>({});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [onlineMap, setOnlineMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !user) return;

    const channel = sb.channel("lp-presence", {
      config: { presence: { key: String(user.id) } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map: Record<number, boolean> = {};
        for (const key of Object.keys(state)) {
          map[Number(key)] = true;
        }
        setOnlineMap(map);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: user.id, role: user.role });
        }
      });

    return () => {
      sb.removeChannel(channel);
    };
  }, [user]);

  return (
    <PresenceContext.Provider value={onlineMap}>
      {children}
    </PresenceContext.Provider>
  );
}

export function useOnlineUsers() {
  return useContext(PresenceContext);
}
