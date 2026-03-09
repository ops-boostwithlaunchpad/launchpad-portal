"use client";

import { Task } from "@/lib/types";
import { PrioBadge } from "./Badge";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const columns: { key: Task["status"]; label: string; color: string }[] = [
  { key: "Queued", label: "Queued", color: "text-gray-500" },
  { key: "In Progress", label: "In Progress", color: "text-amber-600" },
  { key: "Review", label: "Review", color: "text-indigo-600" },
  { key: "Done", label: "Done", color: "text-emerald-600" },
];

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const grouped = {
    Queued: tasks.filter((t) => t.status === "Queued"),
    "In Progress": tasks.filter((t) => t.status === "In Progress"),
    Review: tasks.filter((t) => t.status === "Review"),
    Done: tasks.filter((t) => t.status === "Done"),
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map((col) => (
        <div
          key={col.key}
          className="bg-gray-50 border border-gray-200 rounded-xl p-3 min-h-[180px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>
              {col.label}
            </h4>
            <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">
              {grouped[col.key].length}
            </span>
          </div>
          <div className="space-y-2">
            {grouped[col.key].map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer transition-colors hover:border-indigo-400 shadow-sm"
                onClick={() => onTaskClick(task)}
              >
                <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">
                  {task.client}
                </div>
                <div className="text-xs font-medium text-gray-800 mb-1.5">{task.service}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {task.team.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{task.due}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <PrioBadge priority={task.priority} />
                  {task.status === "In Progress" && (
                    <div className="flex items-center gap-1.5 flex-1">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${task.progress ?? 0}%`, background: "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500">{task.progress ?? 0}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
