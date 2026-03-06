"use client";

import { X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const typeColors: Record<string, string> = {
  task_assigned: "border-purple-200 bg-purple-50",
  task_started: "border-amber-200 bg-amber-50",
  task_completed: "border-emerald-200 bg-emerald-50",
};

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2 sm:max-w-[360px]">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3 rounded-xl border shadow-lg animate-slide-in ${
              typeColors[toast.type] || "border-gray-200 bg-white"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-700">{toast.title}</p>
              <p className="text-[12px] text-gray-500 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
