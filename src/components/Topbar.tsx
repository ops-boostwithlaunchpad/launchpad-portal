"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface TopbarProps {
  title: string;
  children?: React.ReactNode;
}

export function Topbar({ title, children }: TopbarProps) {
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    window.location.reload();
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex flex-wrap items-center gap-2 sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-gray-900 pl-10 lg:pl-0 shrink-0 mr-auto">{title}</h1>
      <div className="shrink-0 lg:hidden flex items-center gap-1">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 cursor-pointer"
          title="Refresh"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <NotificationBell />
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto order-last lg:order-none [&>*]:flex-1 [&>*]:min-w-0 lg:[&>*]:flex-none lg:[&>*]:min-w-fit">
          {children}
        </div>
      )}
      <div className="shrink-0 hidden lg:flex items-center gap-1">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 cursor-pointer"
          title="Refresh"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <NotificationBell />
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-3 py-1.5 text-[12px] text-gray-800 outline-none focus:border-indigo-500 placeholder:text-gray-400"
      />
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-gray-100 border border-gray-200 rounded-lg p-0.5 w-fit mb-5 overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
            active === tab
              ? "bg-indigo-500 text-white font-semibold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
