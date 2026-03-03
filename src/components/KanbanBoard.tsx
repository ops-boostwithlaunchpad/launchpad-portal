"use client";

import { Task } from "@/lib/types";
import { PrioBadge } from "./Badge";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const columns: { key: Task["status"]; label: string; color: string }[] = [
  { key: "Queued", label: "Queued", color: "text-gray-500" },
  { key: "In Progress", label: "In Progress", color: "text-amber-400" },
  { key: "Review", label: "Review", color: "text-indigo-400" },
  { key: "Done", label: "Done", color: "text-emerald-400" },
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
          className="bg-[#111118] border border-[#242433] rounded-xl p-3 min-h-[180px]"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>
              {col.label}
            </h4>
            <span className="text-[10px] bg-[#1a1a26] px-2 py-0.5 rounded-full text-gray-500">
              {grouped[col.key].length}
            </span>
          </div>
          <div className="space-y-2">
            {grouped[col.key].map((task) => (
              <div
                key={task.id}
                className="bg-[#09090f] border border-[#242433] rounded-lg p-3 cursor-pointer transition-colors hover:border-indigo-500/40"
                onClick={() => onTaskClick(task)}
              >
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-1">
                  {task.client}
                </div>
                <div className="text-xs font-medium mb-1.5">{task.service}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">
                    {task.team.split(" ")[0]}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">{task.due}</span>
                </div>
                <div className="mt-1.5">
                  <PrioBadge priority={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
