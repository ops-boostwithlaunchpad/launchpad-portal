"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Select, Textarea } from "@/components/FormGroup";
import { KanbanBoard } from "@/components/KanbanBoard";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { PrioBadge } from "@/components/Badge";
import { Task, TEAMS } from "@/lib/types";

export default function BackendWorkBoardPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [logInput, setLogInput] = useState("");

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => setTasksList(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = teamFilter
    ? tasksList.filter((t) => t.team === teamFilter)
    : tasksList;

  const inProgressCount = filtered.filter((t) => t.status === "In Progress").length;
  const queuedCount = filtered.filter((t) => t.status === "Queued").length;
  const reviewCount = filtered.filter((t) => t.status === "Review").length;
  const doneCount = filtered.filter((t) => t.status === "Done").length;

  function handleTaskClick(task: Task) {
    const current = tasksList.find((t) => t.id === task.id);
    if (current) {
      setSelectedTask(current);
      setLogInput("");
    }
  }

  async function handleStatusUpdate(newStatus: Task["status"]) {
    if (!selectedTask) return;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedTask.id, status: newStatus }),
    });
    setTasksList((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id ? { ...t, status: newStatus } : t
      )
    );
    setSelectedTask(null);
  }

  async function handleSaveLog() {
    if (!selectedTask || !logInput.trim()) return;
    const logEntry = "Mar 3 — " + logInput.trim();
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedTask.id, log: logEntry }),
    });
    setTasksList((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? { ...t, logs: [...t.logs, logEntry] }
          : t
      )
    );
    setSelectedTask((prev) =>
      prev ? { ...prev, logs: [...prev.logs, logEntry] } : null
    );
    setLogInput("");
  }

  if (loading) {
    return (
      <>
        <Topbar title="Backend Work Board" />
        <PageLoader />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Topbar title="Backend Work Board">
        <Select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="!w-[180px]"
        >
          <option value="">All Teams</option>
          {TEAMS.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </Select>
      </Topbar>

      <div className="p-4 md:p-6 overflow-auto">
        <StatsRow>
          <StatCard
            value={String(queuedCount)}
            label="Queued"
          />
          <StatCard
            value={String(inProgressCount)}
            label="In Progress"
            valueColor="yellow"
          />
          <StatCard
            value={String(reviewCount)}
            label="In Review"
            valueColor="blue"
          />
          <StatCard
            value={String(doneCount)}
            label="Done"
            valueColor="green"
          />
        </StatsRow>

        <KanbanBoard tasks={filtered} onTaskClick={handleTaskClick} />
      </div>

      {/* Task Detail Modal */}
      <Modal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.client ?? ""}
        actions={
          <>
            <Button variant="ghost" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
            <Button variant="primary" onClick={handleSaveLog}>
              Save Log
            </Button>
          </>
        }
      >
        {selectedTask && (
          <div className="space-y-4">
            {/* Service label */}
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              {selectedTask.service}
            </p>

            {/* Divider */}
            <div className="h-px bg-gray-200" />

            {/* 3-column grid: Team, Priority, Due */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Team
                </p>
                <p className="text-xs text-gray-800">{selectedTask.team}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Priority
                </p>
                <PrioBadge priority={selectedTask.priority} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                  Due
                </p>
                <p className="text-xs text-gray-800 font-mono">
                  {selectedTask.due}
                </p>
              </div>
            </div>

            {/* Brief section */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
                Brief
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 leading-relaxed">
                {selectedTask.notes}
              </div>
            </div>

            {/* Update Status section */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Update Status
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusUpdate("Queued")}
                >
                  Queued
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!bg-amber-50 !text-amber-600 !border-amber-200 hover:!bg-amber-100"
                  onClick={() => handleStatusUpdate("In Progress")}
                >
                  In Progress
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!bg-indigo-50 !text-indigo-600 !border-indigo-200 hover:!bg-indigo-100"
                  onClick={() => handleStatusUpdate("Review")}
                >
                  Review
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!bg-emerald-50 !text-emerald-600 !border-emerald-200 hover:!bg-emerald-100"
                  onClick={() => handleStatusUpdate("Done")}
                >
                  Done
                </Button>
              </div>
            </div>

            {/* Work Log section */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Work Log
              </p>
              {selectedTask.logs.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {selectedTask.logs.map((log, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 leading-relaxed"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-3">
                  No work logged yet.
                </p>
              )}
              <Textarea
                placeholder="Add a work log entry..."
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
