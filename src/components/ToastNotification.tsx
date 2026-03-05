"use client";

import { X, ClipboardList, Play, CheckCircle2, Info } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const typeIcons: Record<string, typeof Info> = {
  task_assigned: ClipboardList,
  task_started: Play,
  task_completed: CheckCircle2,
};

const typeColors: Record<string, string> = {
  task_assigned: "border-purple-500/30 bg-purple-500/10",
  task_started: "border-amber-500/30 bg-amber-500/10",
  task_completed: "border-emerald-500/30 bg-emerald-500/10",
};

const iconColors: Record<string, string> = {
  task_assigned: "text-purple-400",
  task_started: "text-amber-400",
  task_completed: "text-emerald-400",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-[360px]">
      {toasts.map((toast) => {
        const Icon = typeIcons[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3 rounded-xl border backdrop-blur-sm shadow-lg animate-slide-in ${
              typeColors[toast.type] || "border-[#242433] bg-[#111118]"
            }`}
          >
            <Icon
              size={16}
              className={`mt-0.5 shrink-0 ${iconColors[toast.type] || "text-gray-400"}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-300">{toast.title}</p>
              <p className="text-[12px] text-gray-400 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-500 hover:text-gray-300 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
