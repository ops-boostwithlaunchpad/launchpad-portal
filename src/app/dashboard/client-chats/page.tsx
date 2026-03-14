"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, MessageCircle, Check, CheckCheck, Search, ArrowLeft, UserX } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useOnlineUsers } from "@/lib/PresenceContext";
import { getSupabase } from "@/lib/supabase";
import { useRealtimeClientMessages } from "@/hooks/useRealtimeClientChat";

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

interface ClientThread {
  id: number | null; // lp_users id (null if client has no portal account)
  supabaseClientId: number;
  name: string;
  email: string;
  industry: string;
  unread: number;
  lastMessage: string;
  lastMessageAt: string;
  hasAccount: boolean;
}

export default function ClientChatsPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ClientThread[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const onlineUsers = useOnlineUsers();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  // Fetch client threads
  const fetchThreads = useCallback(async () => {
    try {
      const [unreadRes, usersRes] = await Promise.all([
        fetch("/api/client-messages/unread"),
        fetch("/api/client-messages/threads"),
      ]);

      const unreadData = unreadRes.ok ? await unreadRes.json() : { perClient: {}, lastMessageAt: {} };

      let clientThreads: ClientThread[] = [];

      if (usersRes.ok) {
        const threadsData = await usersRes.json();
        clientThreads = threadsData.map((t: { clientUserId: number | null; supabaseClientId: number; clientName: string; clientEmail: string; industry: string; lastMessage: string; lastMessageAt: string; hasAccount: boolean }) => ({
          id: t.clientUserId,
          supabaseClientId: t.supabaseClientId,
          name: t.clientName,
          email: t.clientEmail,
          industry: t.industry || "",
          unread: t.clientUserId ? (unreadData.perClient?.[t.clientUserId] || 0) : 0,
          lastMessage: t.lastMessage,
          lastMessageAt: t.lastMessageAt,
          hasAccount: t.hasAccount,
        }));
      }

      // Sort: clients with messages first (newest first), then alphabetically
      clientThreads.sort((a, b) => {
        const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        if (ta && tb) return tb - ta;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        return a.name.localeCompare(b.name);
      });

      setThreads(clientThreads);
      setLoadingThreads(false);
    } catch {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  useRealtimeClientMessages("admin-client-threads", fetchThreads);

  // Presence heartbeat
  useEffect(() => {
    if (!user || !selectedClient || !selectedClient.id) return;

    const sendHeartbeat = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openClientChatId: selectedClient.id }),
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
  }, [user, selectedClient]);

  // Fetch messages when client is selected
  useEffect(() => {
    if (!selectedClient || !selectedClient.id) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    fetch(`/api/client-messages?clientUserId=${selectedClient.id}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoadingMessages(false);
        scrollToBottom();
      })
      .catch(() => setLoadingMessages(false));

    // Mark as read
    fetch("/api/client-messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientUserId: selectedClient.id }),
    }).catch(() => {});

    // Update thread unread to 0
    setThreads((prev) =>
      prev.map((t) => t.supabaseClientId === selectedClient.supabaseClientId ? { ...t, unread: 0 } : t)
    );
  }, [selectedClient, scrollToBottom]);

  // Supabase Realtime for messages
  useEffect(() => {
    if (!selectedClient || !selectedClient.id) return;
    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel(`admin-client-chat-${selectedClient.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lp_client_messages" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const rowClientUserId = Number(row.clientUserId ?? row.client_user_id);
          if (rowClientUserId !== selectedClient.id) return;

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

            if (newMsg.senderId !== user?.id) {
              fetch("/api/client-messages", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientUserId: selectedClient.id }),
              }).catch(() => {});
            }

            // Update thread last message
            setThreads((prev) =>
              prev.map((t) =>
                t.supabaseClientId === selectedClient.supabaseClientId
                  ? { ...t, lastMessage: newMsg.message, lastMessageAt: newMsg.createdAt }
                  : t
              )
            );
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
  }, [selectedClient, user, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (selectedClient?.hasAccount) setTimeout(() => inputRef.current?.focus(), 300);
  }, [selectedClient]);

  async function sendMessage() {
    if (!input.trim() || !selectedClient || !selectedClient.id || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimistic: ChatMessage = {
      id: Date.now(),
      clientUserId: selectedClient.id,
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
      const res = await fetch("/api/client-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUserId: selectedClient.id, message: text }),
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

  const filteredThreads = threads.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Client List - Left Panel */}
      <div className={`${selectedClient ? "hidden md:flex" : "flex"} flex-col w-full md:w-[300px] lg:w-[340px] md:min-w-[300px] lg:min-w-[340px] border-r border-gray-200`}>
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
          <h1 className="text-[15px] font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle size={18} className="text-indigo-600" />
            Client Messages
          </h1>
          <div className="mt-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-[13px] focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-[12px] text-gray-400">
                {search ? "No clients match your search" : "No clients found"}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedClient?.supabaseClientId === thread.supabaseClientId;
              const isOnline = thread.id ? !!onlineUsers[thread.id] : false;
              return (
                <button
                  key={thread.supabaseClientId}
                  onClick={() => setSelectedClient(thread)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left ${
                    isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${
                      thread.hasAccount ? "bg-cyan-100 text-cyan-600" : "bg-gray-100 text-gray-400"
                    }`}>
                      {thread.name.charAt(0).toUpperCase()}
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-gray-800 truncate">{thread.name}</span>
                      {thread.lastMessageAt && (
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2" suppressHydrationWarning>
                          {mounted ? formatTime(thread.lastMessageAt) : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{thread.email}</div>
                    {thread.lastMessage ? (
                      <div className="text-[12px] text-gray-500 truncate mt-0.5">
                        {thread.lastMessage}
                      </div>
                    ) : !thread.hasAccount ? (
                      <div className="text-[11px] text-gray-400 italic mt-0.5">No portal account</div>
                    ) : null}
                  </div>
                  {thread.unread > 0 && (
                    <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[9px] font-bold bg-orange-500 text-white shrink-0 mt-1">
                      {thread.unread > 99 ? "99+" : thread.unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Panel - Right */}
      <div className={`${selectedClient ? "flex" : "hidden md:flex"} flex-col flex-1`}>
        {selectedClient ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedClient(null)}
                  className="md:hidden p-1 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold ${
                    selectedClient.hasAccount ? "bg-cyan-100 text-cyan-600" : "bg-gray-100 text-gray-400"
                  }`}>
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  {selectedClient.id && !!onlineUsers[selectedClient.id] && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-gray-800">{selectedClient.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {selectedClient.hasAccount ? (
                      <>
                        <div className={`w-2 h-2 rounded-full ${selectedClient.id && onlineUsers[selectedClient.id] ? "bg-emerald-500" : "bg-gray-300"}`} />
                        <span className={`text-[12px] font-medium ${selectedClient.id && onlineUsers[selectedClient.id] ? "text-emerald-600" : "text-gray-400"}`}>
                          {selectedClient.id && onlineUsers[selectedClient.id] ? "Online" : "Offline"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-400">No portal account</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages or no-account state */}
            {selectedClient.hasAccount ? (
              <>
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 bg-gray-50/50">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <MessageCircle size={24} className="text-gray-300" />
                      </div>
                      <p className="text-[14px] text-gray-400 font-medium">No messages yet</p>
                      <p className="text-[12px] text-gray-300 mt-1">Start the conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const mine = isMe(msg);
                      const isAdminMsg = msg.senderRole === "admin" || msg.senderRole === "subadmin";
                      return (
                        <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[80%]">
                            <div className={`text-[11px] font-medium mb-0.5 px-1 ${mine ? "text-right" : "text-left"} ${
                              isAdminMsg ? "text-indigo-500" : "text-cyan-500"
                            }`}>
                              {mine ? "You" : msg.senderName}
                            </div>
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                                mine
                                  ? "bg-indigo-500 text-white rounded-br-md"
                                  : "bg-cyan-100 text-cyan-900 rounded-bl-md border border-cyan-200"
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
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-gray-200 bg-white shrink-0">
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
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-[14px] focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 bg-gray-50 placeholder:text-gray-400 transition-all"
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
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <UserX size={28} className="text-gray-300" />
                </div>
                <p className="text-[13px] text-gray-500 font-medium">{selectedClient.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  This client hasn&apos;t created a portal account yet.
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Chat will be available once they sign up.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageCircle size={36} className="text-gray-300" />
            </div>
            <p className="text-[14px] text-gray-400 font-medium">Select a client to start chatting</p>
            <p className="text-[11px] text-gray-300 mt-1">Client messages will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
