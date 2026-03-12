"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { Button } from "@/components/Button";
import { ServiceBadge, PrioBadge, StatusBadge } from "@/components/Badge";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeMessages } from "@/hooks/useRealtimeChat";
import type { Task } from "@/lib/types";
import { Paperclip, MessageCircle } from "lucide-react";
import { TaskChatDrawer } from "@/components/TaskChatDrawer";

export default function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("In Queue");
  const [updating, setUpdating] = useState<number | null>(null);
  const [savingProgress, setSavingProgress] = useState<number | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<number, number>>({});
  const [chatTask, setChatTask] = useState<Task | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<number, number>>({});

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/tasks?assignedTo=${user.id}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [];
    setTasks(list);
    setSavedProgress(Object.fromEntries(list.map((t: Task) => [t.id, t.progress ?? 0])));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchTasks();
  }, [authLoading, user, fetchTasks]);

  // Fetch per-task unread message counts
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/task-messages/unread");
      if (res.ok) {
        const data = await res.json();
        if (data.perTask) setUnreadMap(data.perTask);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user || tasks.length === 0) return;
    fetchUnread();
  }, [user, tasks, fetchUnread]);

  // Realtime: refetch unread counts when any message is inserted/updated
  useRealtimeMessages("my-tasks", fetchUnread);

  async function updateStatus(taskId: number, newStatus: string) {
    setUpdating(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Update Failed", data.error || "Failed to update task status", "error");
        setUpdating(null);
        return;
      }
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus as Task["status"], progress: newStatus === "Review" ? 100 : t.progress }
            : t
        )
      );
    } catch {
      showToast("Error", "Something went wrong while updating the task", "error");
    }
    setUpdating(null);
  }

  async function updateProgress(taskId: number, value: number) {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, progress: value } : t)));
    setSavingProgress(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, progress: value }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Save Failed", data.error || "Failed to update progress", "error");
      } else {
        setSavedProgress((prev) => ({ ...prev, [taskId]: value }));
        showToast("Progress Saved", `Progress updated to ${value}%`, "success");
      }
    } catch {
      showToast("Error", "Something went wrong while saving progress", "error");
    }
    setSavingProgress(null);
  }

  if (authLoading || loading) {
    return (
      <>
        <Topbar title="My Tasks" />
        <PageLoader />
      </>
    );
  }

  const isQueued = (s: string) => s.toLowerCase() === "queued" || s.toLowerCase() === "assigned";
  const queueCount = tasks.filter((t) => isQueued(t.status)).length;
  const progressCount = tasks.filter((t) => t.status === "In Progress").length;
  const reviewCount = tasks.filter((t) => t.status === "Review").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "In Queue") return isQueued(t.status);
    if (activeTab === "In Progress") return t.status === "In Progress";
    if (activeTab === "In Review") return t.status === "Review";
    if (activeTab === "Completed") return t.status === "Done";
    return false;
  });

  const tabsWithCounts = [
    { key: "In Queue", label: "Queue", count: queueCount },
    { key: "In Progress", label: "Progress", count: progressCount },
    { key: "In Review", label: "Review", count: reviewCount },
    { key: "Completed", label: "Completed", count: doneCount },
  ];

  return (
    <>
      <Topbar title="My Tasks" />

      <div className="p-4 md:p-6">
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5 w-fit mb-5 overflow-x-auto max-w-full">
          {tabsWithCounts.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-indigo-500 text-white font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold ${
                activeTab === tab.key ? "bg-white/80 text-black" : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-16">
            No tasks {activeTab === "In Queue" ? "in queue" : activeTab === "In Progress" ? "in progress" : activeTab === "In Review" ? "in review" : "completed"}.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-gray-800">{task.client}</span>
                  <StatusBadge status={task.status} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <ServiceBadge service={task.service} />
                  <PrioBadge priority={task.priority} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 mb-2">
                  <span>Team: {task.team}</span>
                  <span>Due: {task.due}</span>
                </div>

                {task.notes && (
                  <div className="text-[12px] text-gray-500 mb-3 leading-relaxed">
                    {task.notes}
                  </div>
                )}

                {task.fileUrl && (
                  <a
                    href={task.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 mb-3 transition-colors"
                  >
                    <Paperclip size={12} />
                    {task.fileName || "Download File"}
                  </a>
                )}

                {/* Progress slider for In Progress tasks */}
                {activeTab === "In Progress" && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-gray-600">Progress</span>
                      <span className="text-[11px] font-bold text-indigo-600">{task.progress ?? 0}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={task.progress ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress: val } : t)));
                      }}
                      disabled={savingProgress === task.id}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                      style={{ background: (task.progress ?? 0) > 0
                        ? `linear-gradient(to right, #f59e0b 0%, #6366f1 ${(task.progress ?? 0) / 2}%, #10b981 ${task.progress ?? 0}%, #e5e7eb ${task.progress ?? 0}%)`
                        : "#e5e7eb" }}
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}

                {/* Progress bar for Review/Completed tabs */}
                {(activeTab === "In Review" || activeTab === "Completed") && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-gray-600">Progress</span>
                      <span className="text-[11px] font-bold text-emerald-600">{task.progress ?? 0}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${task.progress ?? 0}%`, background: "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex items-center gap-2">
                  {/* Status transition buttons */}
                  {activeTab === "In Queue" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(task.id, "In Progress")}
                      disabled={updating === task.id}
                      className="flex gap-1 items-center"
                    >
                      {updating === task.id ? "Starting..." : "Start Task"}
                    </Button>
                  )}

                  {activeTab === "In Progress" && (task.progress ?? 0) < 100 && (
                    <Button
                      size="sm"
                      onClick={() => updateProgress(task.id, task.progress ?? 0)}
                      disabled={savingProgress === task.id || (task.progress ?? 0) === (savedProgress[task.id] ?? 0)}
                      className="flex gap-1 items-center !bg-indigo-500 !text-white !border-indigo-500 hover:!bg-indigo-600 disabled:!opacity-40 disabled:!cursor-not-allowed"
                    >
                      {savingProgress === task.id ? "Updating..." : "Update Progress"}
                    </Button>
                  )}

                  {activeTab === "In Progress" && (task.progress ?? 0) >= 100 && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(task.id, "Review")}
                      disabled={updating === task.id}
                      className="flex gap-1 items-center"
                    >
                      {updating === task.id ? "Submitting..." : "Submit for Review"}
                    </Button>
                  )}

                  {/* Chat button */}
                  <button
                    onClick={() => { setChatTask(task); setChatOpen(true); setUnreadMap((prev) => ({ ...prev, [task.id]: 0 })); }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors relative"
                  >
                    <MessageCircle size={12} />
                    Chat
                    {(unreadMap[task.id] || 0) > 0 && (
                      <span className="ml-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold bg-orange-500 text-white">
                        {unreadMap[task.id]}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Drawer */}
      <TaskChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        task={chatTask}
      />
    </>
  );
}
