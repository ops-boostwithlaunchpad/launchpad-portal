"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";

// --- Types ---

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  task_id: number | null;
  created_at: string;
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Toast[];
  markAsRead: (ids: number[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
}

// --- Context ---

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  toasts: [],
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  dismissToast: () => {},
});

// --- Provider ---

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Add a toast with auto-dismiss
  const addToast = useCallback((notif: Notification) => {
    const toastId = `toast-${notif.id}-${Date.now()}`;
    setToasts((prev) => [
      ...prev,
      { id: toastId, title: notif.title, message: notif.message, type: notif.type },
    ]);
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
      toastTimeouts.current.delete(toastId);
    }, 4000);
    toastTimeouts.current.set(toastId, timeout);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timeout = toastTimeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      toastTimeouts.current.delete(id);
    }
  }, []);

  // Fetch existing notifications on mount
  useEffect(() => {
    if (loading || !user) return;

    async function fetchNotifications() {
      const { data } = await supabase
        .from("lp_notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setNotifications(data);
    }

    fetchNotifications();
  }, [loading, user]);

  // Subscribe to Supabase Realtime
  useEffect(() => {
    if (loading || !user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lp_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          addToast(newNotif);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      for (const timeout of toastTimeouts.current.values()) {
        clearTimeout(timeout);
      }
      toastTimeouts.current.clear();
    };
  }, [loading, user, addToast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (ids: number[]) => {
    await supabase
      .from("lp_notifications")
      .update({ is_read: true })
      .in("id", ids);

    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await markAsRead(unreadIds);
  }, [notifications, markAsRead]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, toasts, markAsRead, markAllAsRead, dismissToast }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// --- Hook ---

export function useNotifications() {
  return useContext(NotificationContext);
}
