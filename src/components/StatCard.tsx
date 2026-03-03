"use client";

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  value: string;
  label: string;
  sub?: string;
  trend?: "up" | "down";
  valueColor?: string;
  icon?: LucideIcon;
  iconColor?: string;
}

const valueColorMap: Record<string, string> = {
  green: "text-emerald-400",
  yellow: "text-amber-400",
  blue: "text-indigo-400",
  red: "text-red-400",
  teal: "text-cyan-400",
  purple: "text-violet-400",
  orange: "text-orange-400",
  default: "text-gray-100",
};

const iconBgMap: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  blue: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  teal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  default: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export function StatCard({ value, label, sub, trend, valueColor = "default", icon: Icon, iconColor }: StatCardProps) {
  const resolvedIconColor = iconColor || valueColor;

  return (
    <div className="bg-[#111118] border border-[#242433] rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-2xl font-bold leading-none font-serif ${valueColorMap[valueColor] || valueColorMap.default}`}>
            {value}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5">{label}</div>
          {sub && (
            <div className={`text-[10px] mt-1 flex items-center gap-1 ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-gray-500"}`}>
              {trend === "up" && <TrendingUp size={10} />}
              {trend === "down" && <TrendingDown size={10} />}
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBgMap[resolvedIconColor] || iconBgMap.default}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {children}
    </div>
  );
}
