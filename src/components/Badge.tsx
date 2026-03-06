"use client";

const colorMap: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-indigo-50 text-indigo-700 border-indigo-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  gray: "bg-gray-100 text-gray-600 border-gray-200",
  teal: "bg-cyan-50 text-cyan-700 border-cyan-200",
  purple: "bg-violet-50 text-violet-700 border-violet-200",
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
