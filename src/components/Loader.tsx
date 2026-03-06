"use client";

import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={28} className="text-indigo-500 animate-spin" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 size={20} className="text-indigo-500 animate-spin" />
    </div>
  );
}
