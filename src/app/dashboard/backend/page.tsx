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
import { useNotifications } from "@/hooks/useNotifications";

export default function BackendWorkBoardPage() {
  const { showToast } = useNotifications();
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [logInput, setLogInput] = useState("");
  const [employees, setEmployees] = useState<{ id: number; name: string; department: string | null }[]>([]);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((res) => res.json()),
      fetch("/api/employees").then((res) => res.json()),
    ])
      .then(([tasks, emps]) => {
        setTasksList(Array.isArray(tasks) ? tasks : []);
        setEmployees(Array.isArray(emps) ? emps : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = tasksList
    .filter((t) => !teamFilter || t.team === teamFilter);

  const teamFiltered = tasksList.filter((t) => !teamFilter || t.team === teamFilter);
  const inProgressCount = teamFiltered.filter((t) => t.status === "In Progress").length;
  const queuedCount = teamFiltered.filter((t) => t.status === "Queued").length;
  const reviewCount = teamFiltered.filter((t) => t.status === "Review").length;
  const doneCount = teamFiltered.filter((t) => t.status === "Done").length;

  function handleTaskClick(task: Task) {
    const current = tasksList.find((t) => t.id === task.id);
    if (current) {
      setSelectedTask(current);
      setLogInput("");
    }
  }

  async function handleStatusUpdate(newStatus: Task["status"]) {
    if (!selectedTask) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTask.id, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Update Failed", data.error || "Failed to update task status", "error");
        return;
      }
      setTasksList((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, status: newStatus } : t
        )
      );
      setSelectedTask(null);
    } catch {
      showToast("Error", "Something went wrong while updating the task", "error");
    }
  }

  async function handleReassign(employeeId: number | null) {
    if (!selectedTask) return;
    setReassigning(true);
    const emp = employees.find((e) => e.id === employeeId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTask.id,
          assignedTo: employeeId,
          assignedToName: emp?.name || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Reassign Failed", data.error || "Failed to reassign task", "error");
        setReassigning(false);
        return;
      }
      const updated = { ...selectedTask, assignedTo: employeeId, assignedToName: emp?.name || null };
      setTasksList((prev) => prev.map((t) => (t.id === selectedTask.id ? { ...t, ...updated } : t)));
      setSelectedTask(updated);
      showToast("Reassigned", `Task reassigned to ${emp?.name || "unassigned"}`, "success");
    } catch {
      showToast("Error", "Something went wrong while reassigning", "error");
    }
    setReassigning(false);
  }

  async function handleSaveLog() {
    if (!selectedTask || !logInput.trim()) return;
    const logEntry = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " — " + logInput.trim();
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTask.id, log: logEntry }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Save Failed", data.error || "Failed to save work log", "error");
        return;
      }
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
    } catch {
      showToast("Error", "Something went wrong while saving the log", "error");
    }
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

            {/* Assigned To / Reassign */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Assigned To
              </p>
              <Select
                value={selectedTask.assignedTo ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleReassign(val ? Number(val) : null);
                }}
                disabled={reassigning}
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.department ? ` — ${emp.department}` : ""}
                  </option>
                ))}
              </Select>
            </div>

            {/* Progress */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">
                Progress
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${selectedTask.progress ?? 0}%`, background: "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 min-w-[36px] text-right">
                  {selectedTask.progress ?? 0}%
                </span>
              </div>
            </div>

            {/* Update Status section */}
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">
                Update Status
              </p>
              {selectedTask.status === "Review" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
                  <p className="text-[11px] text-indigo-700 font-medium">
                    This task has been submitted for review by the employee.
                  </p>
                </div>
              )}
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
                  size="sm"
                  className={selectedTask.status === "Review"
                    ? "!bg-emerald-500 !text-white !border-emerald-500 hover:!bg-emerald-600"
                    : "!bg-emerald-50 !text-emerald-600 !border-emerald-200 hover:!bg-emerald-100"}
                  onClick={() => handleStatusUpdate("Done")}
                >
                  {selectedTask.status === "Review" ? "Approve & Mark Done" : "Done"}
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
