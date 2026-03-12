"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { ServiceBadge, PrioBadge, StatusBadge } from "@/components/Badge";
import { TaskChatDrawer } from "@/components/TaskChatDrawer";
import { useAuth } from "@/lib/AuthContext";
import { useOnlineUsers } from "@/lib/PresenceContext";
import { useRealtimeMessages } from "@/hooks/useRealtimeChat";
import type { Task } from "@/lib/types";
import { MessageCircle, Clock, User, ChevronRight } from "lucide-react";

const TABS = [
  { key: "Assigned", status: "Queued", color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "In Progress", status: "In Progress", color: "bg-amber-500", lightColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "In Review", status: "Review", color: "bg-purple-500", lightColor: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "Done", status: "Done", color: "bg-emerald-500", lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export default function OngoingTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Assigned");
  const [search, setSearch] = useState("");
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});
  const [lastMsgMap, setLastMsgMap] = useState<Record<number, string>>({});
  const onlineUsers = useOnlineUsers();

  // Fetch all assigned tasks
  useEffect(() => {
    if (authLoading || !user) return;
    fetch("/api/tasks").then((r) => r.json()).then((taskData) => {
      const allTasks = Array.isArray(taskData) ? taskData : [];
      setTasks(allTasks.filter((t: Task) => t.assignedTo));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [authLoading, user]);

  // Fetch per-task unread counts + lastMessageAt
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/task-messages/unread");
      const data = await res.json();
      if (data.perTask) setUnreadMap(data.perTask);
      if (data.lastMessageAt) setLastMsgMap(data.lastMessageAt);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tasks.length === 0) return;
    fetchUnread();
  }, [tasks, fetchUnread]);

  // Realtime: refetch unread counts when any message is inserted/updated
  useRealtimeMessages("ongoing-tasks", fetchUnread);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const tab of TABS) {
      if (tab.status === "Queued") {
        c[tab.key] = tasks.filter((t) => t.status === "Queued" || t.status.toLowerCase() === "assigned").length;
      } else {
        c[tab.key] = tasks.filter((t) => t.status === tab.status).length;
      }
    }
    return c;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab) return [];
    let list = tab.status === "Queued"
      ? tasks.filter((t) => t.status === "Queued" || t.status.toLowerCase() === "assigned")
      : tasks.filter((t) => t.status === tab.status);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.client.toLowerCase().includes(q) ||
          t.service.toLowerCase().includes(q) ||
          (t.assignedToName || "").toLowerCase().includes(q)
      );
    }

    // Sort: tasks with latest messages first
    list = [...list].sort((a, b) => {
      const aTime = lastMsgMap[a.id] ? new Date(lastMsgMap[a.id]).getTime() : 0;
      const bTime = lastMsgMap[b.id] ? new Date(lastMsgMap[b.id]).getTime() : 0;
      return bTime - aTime;
    });

    return list;
  }, [tasks, activeTab, search, lastMsgMap]);

  function openChat(task: Task) {
    setChatTask(task);
    setChatOpen(true);
    setUnreadMap((prev) => ({ ...prev, [task.id]: 0 }));
  }

  if (authLoading || loading) {
    return (
      <>
        <Topbar title="Ongoing Tasks" />
        <PageLoader />
      </>
    );
  }

  const currentTabData = TABS.find((t) => t.key === activeTab)!;

  return (
    <>
      <Topbar title="Ongoing Tasks" />

      <div className="p-4 md:p-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {TABS.map((tab) => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                activeTab === tab.key
                  ? `${tab.lightColor} border shadow-sm`
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-wider font-semibold ${
                activeTab === tab.key ? "" : "text-gray-400"
              }`}>
                {tab.key}
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                activeTab === tab.key ? "" : "text-gray-800"
              }`}>
                {counts[tab.key] || 0}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4 max-w-sm">
          <SearchInput value={search} onChange={setSearch} placeholder="Search tasks..." />
        </div>

        {/* Tab indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${currentTabData.color}`} />
          <span className="text-[13px] font-semibold text-gray-700">
            {activeTab} ({filteredTasks.length})
          </span>
        </div>

        {/* Task list */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No {activeTab.toLowerCase()} tasks found.
          </div>
        ) : (
          <div className="grid gap-2.5">
            {filteredTasks.map((task) => {
              const hasUnread = (unreadMap[task.id] || 0) > 0;
              const isOnline = task.assignedTo ? !!onlineUsers[task.assignedTo] : false;
              return (
                <div
                  key={task.id}
                  onClick={() => openChat(task)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Client + Status */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] font-semibold text-gray-800 truncate">{task.client}</span>
                          {hasUnread && (
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={task.status} />
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      </div>

                      {/* Row 2: Service + Priority */}
                      <div className="flex items-center gap-2 mb-2">
                        <ServiceBadge service={task.service} />
                        <PrioBadge priority={task.priority} />
                      </div>

                      {/* Row 3: Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-gray-500">
                        {task.assignedToName && (
                          <span className="flex items-center gap-1.5">
                            <span className="relative flex">
                              <User size={10} className="text-gray-400" />
                              <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${
                                isOnline ? "bg-emerald-500" : "bg-gray-300"
                              }`} />
                            </span>
                            <span className={isOnline ? "text-emerald-600 font-medium" : ""}>
                              {task.assignedToName}
                            </span>
                          </span>
                        )}
                        {task.due && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} className="text-gray-400" />
                            Due: {task.due}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageCircle size={10} className="text-gray-400" />
                          Chat
                          {hasUnread && (
                            <span className="ml-0.5 bg-orange-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                              {unreadMap[task.id]}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {(task.status === "In Progress" || task.status === "Review" || task.status === "Done") && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-gray-400">Progress</span>
                            <span className="text-[9px] font-bold text-gray-500">{task.progress ?? 0}%</span>
                          </div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${task.progress ?? 0}%`,
                                background: task.status === "Done"
                                  ? "#10b981"
                                  : task.status === "Review"
                                    ? "#8b5cf6"
                                    : "linear-gradient(to right, #f59e0b, #6366f1)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Drawer */}
      <TaskChatDrawer
        open={chatOpen}
        onClose={() => { setChatOpen(false); fetchUnread(); }}
        task={chatTask}
      />
    </>
  );
}
