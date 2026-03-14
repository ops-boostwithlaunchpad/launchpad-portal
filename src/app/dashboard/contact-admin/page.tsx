"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useOnlineUsers } from "@/lib/PresenceContext";
import { getSupabase } from "@/lib/supabase";

interface ChatMessage {
  id: number;
  clientUserId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  _optimistic?: boolean;
}

export default function ContactAdminPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const onlineUsers = useOnlineUsers();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMsgCountRef = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Check if any admin or subadmin is online (not hardcoded to userId 0)
  const adminOnline = Object.keys(onlineUsers).length > 0 &&
    Object.entries(onlineUsers).some(([, online]) => online);
  // We can't know roles from presence alone, so just show if anyone is online
  // A better approach: check all entries — the PresenceContext tracks { userId, role }
  // but currently only stores boolean. For now, we assume admins are present.

  // Presence heartbeat
  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openClientChatId: user.id }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    return () => {
      clearInterval(interval);
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openClientChatId: null }),
      }).catch(() => {});
    };
  }, [user]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/client-messages?clientUserId=${user.id}`);
      const data = await res.json();
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
      // Scroll if new messages arrived
      if (msgs.length > lastMsgCountRef.current) {
        scrollToBottom();
      }
      lastMsgCountRef.current = msgs.length;
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [user, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
    // Mark as read
    if (user) {
      fetch("/api/client-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: user.id }),
      }).catch(() => {});
    }
  }, [user, fetchMessages]);

  // Supabase Realtime (works if replication is enabled on lp_client_messages)
  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`client-chat-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lp_client_messages" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const rowClientUserId = Number(row.clientUserId ?? row.client_user_id);
          if (rowClientUserId !== user.id) return;

          if (payload.eventType === "INSERT") {
            const newMsg: ChatMessage = {
              id: row.id as number,
              clientUserId: rowClientUserId,
              senderId: (row.senderId ?? row.sender_id) as number,
              senderName: (row.senderName ?? row.sender_name) as string,
              senderRole: (row.senderRole ?? row.sender_role) as string,
              message: row.message as string,
              isRead: (row.isRead ?? row.is_read) as boolean,
              createdAt: (row.createdAt ?? row.created_at) as string,
            };
            setMessages((prev) => {
              const withoutOptimistic = prev.filter(
                (m) => !(m._optimistic && m.senderId === newMsg.senderId && m.message === newMsg.message)
              );
              if (withoutOptimistic.some((m) => m.id === newMsg.id)) return withoutOptimistic;
              return [...withoutOptimistic, newMsg];
            });
            scrollToBottom();

            if (newMsg.senderId !== user.id) {
              fetch("/api/client-messages", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientUserId: user.id }),
              }).catch(() => {});
            }
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (row.id as number) ? { ...m, isRead: (row.isRead ?? row.is_read) as boolean } : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [user, scrollToBottom]);

  // Focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  async function sendMessage() {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: Date.now(),
      clientUserId: user.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      message: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch("/api/client-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: user.id, message: text }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...saved, _optimistic: false } : m))
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, _optimistic: false } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, _optimistic: false } : m))
      );
    }
    setSending(false);
  }

  function formatTime(dateStr: string) {
    let isoStr = dateStr;
    if (isoStr && !isoStr.endsWith("Z") && !isoStr.includes("+") && !/\d{2}:\d{2}:\d{2}-/.test(isoStr)) {
      isoStr = isoStr + "Z";
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    if (isToday) return time;
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
  }

  const isMe = (msg: ChatMessage) => msg.senderId === user?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <MessageCircle size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-gray-800">Contact Admin</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${adminOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
              <span className={`text-[12px] font-medium ${adminOnline ? "text-emerald-600" : "text-gray-400"}`}>
                Admin — {adminOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 bg-gray-50/50">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageCircle size={28} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-400 font-medium">No messages yet</p>
            <p className="text-[12px] text-gray-300 mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full space-y-3">
            {messages.map((msg) => {
              const mine = isMe(msg);
              const isAdminMsg = msg.senderRole === "admin" || msg.senderRole === "subadmin";
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[75%]">
                    <div className={`text-[11px] font-medium mb-0.5 px-1 ${mine ? "text-right" : "text-left"} ${
                      isAdminMsg ? "text-indigo-500" : "text-cyan-500"
                    }`}>
                      {mine ? "You" : msg.senderName}
                    </div>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                        mine
                          ? "bg-indigo-500 text-white rounded-br-md"
                          : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                      }`}
                    >
                      {msg.message}
                    </div>
                    <div className={`flex items-center gap-1 mt-1 px-1 ${mine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[11px] text-gray-400" suppressHydrationWarning>
                        {mounted ? formatTime(msg.createdAt) : ""}
                      </span>
                      {mine && (
                        msg._optimistic ? (
                          <span className="text-gray-300"><Check size={12} /></span>
                        ) : msg.isRead ? (
                          <span className="text-blue-500"><CheckCheck size={12} /></span>
                        ) : (
                          <span className="text-gray-400"><CheckCheck size={12} /></span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white shrink-0">
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-gray-50 placeholder:text-gray-400 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
