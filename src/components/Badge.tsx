"use client";

const colorMap: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  blue: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  gray: "bg-white/5 text-gray-400 border-white/10",
  teal: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const stageBadge: Record<string, string> = {
  Won: "green",
  Proposal: "blue",
  Negotiation: "yellow",
  Prospect: "gray",
  Lost: "red",
};

const prioBadge: Record<string, string> = {
  Urgent: "red",
  High: "orange",
  Normal: "gray",
};

const statusBadge: Record<string, string> = {
  Active: "green",
  Onboarding: "yellow",
  Inactive: "gray",
  Paused: "yellow",
  Churned: "red",
  Queued: "gray",
  "In Progress": "yellow",
  Review: "blue",
  Done: "green",
};

const svcBadge: Record<string, string> = {
  "Local SEO": "green",
  "AI SEO": "teal",
  LSA: "orange",
  "Google Ads": "yellow",
  "Meta Ads": "purple",
  Automation: "blue",
};

export function Badge({
  children,
  color,
  size = "sm",
}: {
  children: React.ReactNode;
  color: string;
  size?: "xs" | "sm";
}) {
  const cls = colorMap[color] || colorMap.gray;
  return (
    <span
      className={`inline-flex items-center border rounded-full font-semibold tracking-wide ${cls} ${
        size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      {children}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return <Badge color={stageBadge[stage] || "gray"}>{stage}</Badge>;
}

export function PrioBadge({ priority }: { priority: string }) {
  return <Badge color={prioBadge[priority] || "gray"}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={statusBadge[status] || "gray"}>{status}</Badge>;
}

export function ServiceBadge({ service }: { service: string }) {
  return <Badge color={svcBadge[service] || "gray"}>{service}</Badge>;
}

export function ServiceBadges({ services }: { services: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {services.map((s) => (
        <ServiceBadge key={s} service={s} />
      ))}
    </div>
  );
}
