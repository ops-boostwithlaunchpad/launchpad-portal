"use client";

const bgColors = [
  "bg-indigo-500/20 text-indigo-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-violet-500/20 text-violet-400",
  "bg-rose-500/20 text-rose-400",
  "bg-orange-500/20 text-orange-400",
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
