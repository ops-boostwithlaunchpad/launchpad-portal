export type Role = "admin" | "subadmin" | "sales" | "backend" | "client" | "employee" | "agent" | "agency";

export type Department =
  | "Local SEO"
  | "AI SEO"
  | "Local Service Ads"
  | "Google Ads"
  | "Meta Ads"
  | "Automation"
  | "Developer";

export const DEPARTMENTS: Department[] = [
  "Local SEO",
  "AI SEO",
  "Local Service Ads",
  "Google Ads",
  "Meta Ads",
  "Automation",
  "Developer",
];

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Deal {
  id: number;
  client: string;
  industry: string;
  agent: string;
  services: string[];
  mrr: number;
  stage: "Prospect" | "Proposal" | "Negotiation" | "Won" | "Lost";
  close: string;
  approval: "Pending" | "Approved" | "Rejected";
  rejectionReason: string | null;
  submittedBy: string | null;
  agencyId: number | null;
}

export interface Agency {
  id: number;
  name: string;
  agency: string;
  email: string;
  agents: number;
  clients: number;
  mrr: number;
  commission: number;
  status: "Active" | "Onboarding" | "Inactive";
}

export interface Agent {
  id: number;
  name: string;
  agency: string;
  email: string;
  closed: number;
  mrr: number;
  commission: number;
  month: number;
  status: "Active" | "Onboarding" | "Inactive";
}

export interface Client {
  id: number;
  name: string;
  industry: string;
  contact: string;
  email: string;
  services: string[];
  mrr: number;
  start: string;
  rep: string;
  website: string;
  status: "Active" | "Paused" | "Churned";
}

export interface Task {
  id: number;
  client: string;
  service: string;
  team: string;
  priority: "Urgent" | "High" | "Normal";
  due: string;
  notes: string;
  status: "Queued" | "In Progress" | "Review" | "Done";
  logs: string[];
  assignedTo?: number | null;
  assignedToName?: string | null;
}

export type ServiceType =
  | "Local SEO"
  | "AI SEO"
  | "LSA"
  | "Google Ads"
  | "Meta Ads"
  | "Automation";

export const SVC_BADGE: Record<string, string> = {
  "Local SEO": "green",
  "AI SEO": "teal",
  LSA: "orange",
  "Google Ads": "yellow",
  "Meta Ads": "purple",
  Automation: "blue",
};

export const SVC_DESC: Record<string, string> = {
  "Local SEO": "GBP · Google Maps · Citations · Review Generation",
  "AI SEO": "ChatGPT · Gemini · Perplexity recommendations",
  LSA: "Google Guaranteed badge · Pay-per-lead management",
  "Google Ads": "Search · Display · Retargeting campaigns",
  "Meta Ads": "Facebook & Instagram targeting funnels",
  Automation: "n8n workflows · Custom AI agents",
};

export const INDUSTRIES = [
  "Personal Injury Law",
  "Criminal Defense Law",
  "Family Law",
  "Healthcare / Medical",
  "Dental",
  "Construction",
  "Home Services",
  "Real Estate",
  "Insurance",
  "Other",
];

export const SERVICE_OPTIONS: ServiceType[] = [
  "Local SEO",
  "AI SEO",
  "LSA",
  "Google Ads",
  "Meta Ads",
  "Automation",
];

export const TEAMS = [
  "SEO & GBP Team",
  "AI SEO Team",
  "Paid Ads Team",
  "Automation Team (n8n)",
  "Technical Team",
];
