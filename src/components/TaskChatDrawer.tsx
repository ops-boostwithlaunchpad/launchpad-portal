"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageCircle, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useOnlineUsers } from "@/lib/PresenceContext";
import { getSupabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";
import { ServiceBadge, PrioBadge } from "@/components/Badge";

interface ChatMessage {
  id: number;
  taskId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  _optimistic?: boolean; // local-only flag
}

interface TaskChatDrawerProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
}

export function TaskChatDrawer({ open, onClose, task }: TaskChatDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const onlineUsers = useOnlineUsers();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Presence heartbeat — tell server we have this chat open
  useEffect(() => {
    if (!open || !task || !user) return;

    const sendHeartbeat = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openTaskId: task.id }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    return () => {
      clearInterval(interval);
      // Clear open task on close
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openTaskId: null }),
      }).catch(() => {});
    };
  }, [open, task, user]);

  // Derive peer online status from global Supabase Presence
  const isAdmin = user?.role === "admin" || user?.role === "subadmin";
  const peerId = isAdmin ? task?.assignedTo : 0; // 0 = admin
  const peerOnline = peerId != null ? !!onlineUsers[peerId] : false;

  // Fetch messages when task changes
  useEffect(() => {
    if (!open || !task) return;
    setLoading(true);
    fetch(`/api/task-messages?taskId=${task.id}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
        scrollToBottom();
      })
      .catch(() => setLoading(false));

    // Mark messages as read
    fetch("/api/task-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    }).catch(() => {});
  }, [open, task, scrollToBottom]);

  // Supabase Realtime subscription for new messages (no filter — filter client-side)
  useEffect(() => {
    if (!open || !task) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`task-chat-${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lp_task_messages",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // Handle both camelCase (TypeORM) and snake_case column names
          const rowTaskId = Number(row.taskId ?? row.task_id);
          if (rowTaskId !== task.id) return;

          if (payload.eventType === "INSERT") {
            const newMsg: ChatMessage = {
              id: row.id as number,
              taskId: rowTaskId,
              senderId: (row.senderId ?? row.sender_id) as number,
              senderName: (row.senderName ?? row.sender_name) as string,
              senderRole: (row.senderRole ?? row.sender_role) as string,
              message: row.message as string,
              isRead: (row.isRead ?? row.is_read) as boolean,
              createdAt: (row.createdAt ?? row.created_at) as string,
            };
            setMessages((prev) => {
              // Replace optimistic message or avoid duplicate
              const withoutOptimistic = prev.filter(
                (m) => !(m._optimistic && m.senderId === newMsg.senderId && m.message === newMsg.message)
              );
              if (withoutOptimistic.some((m) => m.id === newMsg.id)) return withoutOptimistic;
              return [...withoutOptimistic, newMsg];
            });
            scrollToBottom();

            // Auto-mark as read if not from current user
            if (newMsg.senderId !== user?.id) {
              fetch("/api/task-messages", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ taskId: task.id }),
              }).catch(() => {});
            }
          } else if (payload.eventType === "UPDATE") {
            // isRead changed — update the message in state
            setMessages((prev) =>
              prev.map((m) =>
                m.id === (row.id as number) ? { ...m, isRead: (row.isRead ?? row.is_read) as boolean } : m
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [open, task, user, scrollToBottom]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function sendMessage() {
    if (!input.trim() || !task || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const optimistic: ChatMessage = {
      id: Date.now(),
      taskId: task.id,
      senderId: user!.id,
      senderName: user!.name,
      senderRole: user!.role,
      message: text,
      isRead: false,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch("/api/task-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, message: text }),
      });
      if (res.ok) {
        const saved = await res.json();
        // Replace optimistic with real message (Realtime may also do this)
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...saved, _optimistic: false } : m))
        );
      } else {
        // Remove optimistic flag but keep as "failed"
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
    // Ensure UTC is parsed correctly — append Z if no timezone info
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
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        } w-full sm:w-[420px]`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <MessageCircle size={16} className="text-indigo-600" />
              </div>
              <div>
                <span className="font-semibold text-[13px] text-gray-800">Task Chat</span>
                {/* Online indicator for the other party */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${peerOnline ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <span className={`text-[9px] font-medium ${peerOnline ? "text-emerald-600" : "text-gray-400"}`}>
                    {task?.assignedToName
                      ? (user?.role === "admin" || user?.role === "subadmin")
                        ? `${task.assignedToName} — ${peerOnline ? "Online" : "Offline"}`
                        : peerOnline ? "Admin — Online" : "Admin — Offline"
                      : ""}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          {task && (
            <div className="space-y-1">
              <div className="text-[12px] font-medium text-gray-700">{task.client}</div>
              <div className="flex items-center gap-2">
                <ServiceBadge service={task.service} />
                <PrioBadge priority={task.priority} />
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <MessageCircle size={24} className="text-gray-300" />
              </div>
              <p className="text-[12px] text-gray-400">No messages yet</p>
              <p className="text-[10px] text-gray-300 mt-1">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = isMe(msg);
              const isAdminMsg = msg.senderRole === "admin" || msg.senderRole === "subadmin";
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%]`}>
                    {/* Sender label */}
                    <div className={`text-[9px] font-medium mb-0.5 px-1 ${mine ? "text-right" : "text-left"} ${
                      isAdminMsg ? "text-indigo-500" : "text-emerald-500"
                    }`}>
                      {mine ? "You" : msg.senderName}
                      {/* <span className="text-gray-800 ml-1 text-[8px] font-normal">
                        {isAdminMsg ? "Admin" : "Employee"}
                      </span> */}
                    </div>
                    {/* Bubble */}
                    <div
                      className={`px-3 py-2 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                        mine
                          ? isAdminMsg
                            ? "bg-indigo-500 text-white rounded-br-md"
                            : "bg-emerald-500 text-white rounded-br-md"
                          : isAdminMsg
                            ? "bg-indigo-100 text-indigo-900 rounded-bl-md border border-indigo-200"
                            : "bg-emerald-100 text-emerald-900 rounded-bl-md border border-emerald-200"
                      }`}
                    >
                      {msg.message}
                    </div>
                    {/* Time + sent/seen ticks */}
                    <div className={`flex items-center gap-1 mt-0.5 px-1 ${mine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[8px] text-gray-400" suppressHydrationWarning>
                        {mounted ? formatTime(msg.createdAt) : ""}
                      </span>
                      {mine && (
                        msg._optimistic ? (
                          <span className="text-gray-300"><Check size={10} /></span>
                        ) : msg.isRead ? (
                          <span className="text-blue-500"><CheckCheck size={10} /></span>
                        ) : (
                          <span className="text-gray-400"><CheckCheck size={10} /></span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-200 bg-white">
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
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-[12.5px] focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-gray-50 placeholder:text-gray-400 transition-all"
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
    </>
  );
}
