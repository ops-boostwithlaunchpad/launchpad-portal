"use client";

interface StatCardProps {
  value: string;
  label: string;
  sub?: string;
  trend?: "up" | "down";
  valueColor?: string;
}

const valueColorMap: Record<string, string> = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  blue: "text-indigo-600",
  red: "text-red-600",
  teal: "text-cyan-600",
  purple: "text-violet-600",
  orange: "text-orange-600",
  default: "text-gray-900",
};

export function StatCard({ value, label, sub, trend, valueColor = "default" }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div>
        <div className={`text-1xl font-bold leading-none font-serif ${valueColorMap[valueColor] || valueColorMap.default}`}>
          {value}
        </div>
        <div className="text-[11px] text-gray-500 mt-1.5">{label}</div>
        {sub && (
          <div className={`text-[10px] mt-1 flex items-center gap-1 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-gray-500"}`}>
            {sub}
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
