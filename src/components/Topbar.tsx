"use client";

import { Search } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface TopbarProps {
  title: string;
  children?: React.ReactNode;
}

export function Topbar({ title, children }: TopbarProps) {
  return (
    <div className="bg-[#111118] border-b border-[#242433] px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-sm font-semibold pl-10 lg:pl-0">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
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
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[140px] md:w-[180px] bg-[#09090f] border border-[#242433] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-gray-200 outline-none focus:border-indigo-500 placeholder:text-gray-600"
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
    <div className="flex gap-0.5 bg-[#111118] border border-[#242433] rounded-lg p-0.5 w-fit mb-5">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
            active === tab
              ? "bg-indigo-500 text-white font-semibold"
              : "text-gray-500 hover:text-gray-200"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
