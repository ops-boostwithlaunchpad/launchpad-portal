"use client";

const bgColors = [
  "bg-indigo-100 text-indigo-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-cyan-100 text-cyan-600",
  "bg-violet-100 text-violet-600",
  "bg-rose-100 text-rose-600",
  "bg-orange-100 text-orange-600",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return bgColors[Math.abs(hash) % bgColors.length];
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-[9px]",
    md: "w-7 h-7 text-[10px]",
    lg: "w-10 h-10 text-sm",
  };

  return (
    <div
      className={`${sizeClasses[size]} ${getColor(name)} rounded-full flex items-center justify-center font-bold shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
