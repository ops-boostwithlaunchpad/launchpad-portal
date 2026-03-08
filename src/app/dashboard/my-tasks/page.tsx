"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { Button } from "@/components/Button";
import { ServiceBadge, PrioBadge, StatusBadge } from "@/components/Badge";
import { useAuth } from "@/lib/AuthContext";
import type { Task } from "@/lib/types";
import { RefreshCcw } from "lucide-react";

export default function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("In Queue");
  const [updating, setUpdating] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/tasks?assignedTo=${user.id}`);
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) fetchTasks();
  }, [authLoading, user, fetchTasks]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }

  async function updateStatus(taskId: number, newStatus: string) {
    setUpdating(taskId);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t))
    );
    setUpdating(null);
  }

  if (authLoading || loading) {
    return (
      <>
        <Topbar title="My Tasks" />
        <PageLoader />
      </>
    );
  }

  const isQueued = (s: string) => s === "queued" || s === "assigned";
  const queueCount = tasks.filter((t) => isQueued(t.status)).length;
  const progressCount = tasks.filter((t) => t.status === "In Progress").length;
  const doneCount = tasks.filter((t) => t.status === "Done").length;

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === "In Queue") return isQueued(t.status);
    if (activeTab === "In Progress") return t.status === "In Progress";
    if (activeTab === "Completed") return t.status === "Done";
    return false;
  });

  const tabsWithCounts = [
    { key: "In Queue", label: "Queue", count: queueCount },
    { key: "In Progress", label: "Progress", count: progressCount },
    { key: "Completed", label: "Completed", count: doneCount },
  ];

  return (
    <>
      <Topbar title="My Tasks">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-700 transition-colors p-1.5 cursor-pointer"
          title="Refresh tasks"
        >
          <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </Topbar>

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
            No tasks {activeTab === "In Queue" ? "in queue" : activeTab === "In Progress" ? "in progress" : "completed"}.
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

                {activeTab === "In Progress" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(task.id, "Done")}
                    disabled={updating === task.id}
                     className="flex gap-1 items-center"
                  >
                    {updating === task.id ? "Completing..." : "Mark Complete"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
