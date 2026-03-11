"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import {
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Calendar,
  AlertCircle,
  User,
  CreditCard,
  ClipboardList,
  Mail,
  AlertTriangle,
  Activity,
  Handshake,
  Users,
  X,
  ArrowRight,
} from "lucide-react";

interface LogEntry {
  id: number;
  event: string;
  category: string;
  message: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: Activity },
  { key: "auth", label: "Auth", icon: User },
  { key: "deals", label: "Deals", icon: Handshake },
  { key: "clients", label: "Clients", icon: Users },
  { key: "employees", label: "Employees", icon: User },
  { key: "tasks", label: "Tasks", icon: ClipboardList },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "errors", label: "Errors", icon: AlertTriangle },
];

const categoryStyle: Record<string, { bg: string; text: string; dot: string; border: string; activeBg: string }> = {
  all:       { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-indigo-200", activeBg: "bg-indigo-600" },
  system:    { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-500", border: "border-slate-200", activeBg: "bg-slate-600" },
  auth:      { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200", activeBg: "bg-blue-600" },
  deals:     { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200", activeBg: "bg-emerald-600" },
  clients:   { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500", border: "border-cyan-200", activeBg: "bg-cyan-600" },
  employees: { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500", border: "border-pink-200", activeBg: "bg-pink-600" },
  tasks:     { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200", activeBg: "bg-amber-600" },
  payments:  { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", activeBg: "bg-green-600" },
  emails:    { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-200", activeBg: "bg-purple-600" },
  errors:    { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", border: "border-red-200", activeBg: "bg-red-600" },
  // n8n-generated categories — map to parent tab colors
  proposal:   { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", activeBg: "bg-green-600" },
  payment:    { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", border: "border-green-200", activeBg: "bg-green-600" },
  agreement:  { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", border: "border-purple-200", activeBg: "bg-purple-600" },
  onboarding: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500", border: "border-cyan-200", activeBg: "bg-cyan-600" },
};

const eventStyle: Record<string, string> = {
  deal_created: "bg-emerald-500",
  deal_approved: "bg-green-500",
  deal_rejected: "bg-red-500",
  task_created: "bg-blue-500",
  task_assigned: "bg-indigo-500",
  task_status_update: "bg-amber-500",
  user_login: "bg-sky-500",
  user_created: "bg-violet-500",
  client_login: "bg-cyan-500",
  payment_link_sent: "bg-green-500",
  payment_success: "bg-emerald-500",
  agreement_sent: "bg-purple-500",
  welcome_email_sent: "bg-teal-500",
  proposal: "bg-teal-500",
  agreement: "bg-violet-500",
  payment: "bg-green-500",
  onboarding: "bg-sky-500",
};

const roleBadge: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  subadmin: "bg-sky-100 text-sky-700",
  sales: "bg-emerald-100 text-emerald-700",
  backend: "bg-amber-100 text-amber-700",
  client: "bg-cyan-100 text-cyan-700",
  employee: "bg-pink-100 text-pink-700",
  agent: "bg-violet-100 text-violet-700",
  agency: "bg-orange-100 text-orange-700",
};

function parseDate(dateStr: string) {
  let iso = dateStr;
  if (!iso.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(iso)) {
    iso = iso.replace(" ", "T");
    if (!iso.includes("T")) iso += "T00:00:00";
    iso += "Z";
  }
  return new Date(iso);
}

function formatDate(dateStr: string) {
  const d = parseDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffSec < 30) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFullDate(dateStr: string) {
  return parseDate(dateStr).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function RichMessage({ message }: { message: string }) {
  const parts = message.split(
    /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\$[\d,.]+(?:\/mo)?|"[^"]+"|(?:In Progress|Queued|Review|Done|Approved|Rejected|Pending))/g
  );
  return (
    <span>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/i.test(part))
          return <span key={i} className="font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{part}</span>;
        if (/^\$[\d,.]+/.test(part))
          return <span key={i} className="font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{part}</span>;
        if (part.startsWith('"') && part.endsWith('"'))
          return <span key={i} className="font-semibold text-gray-900">&ldquo;{part.slice(1, -1)}&rdquo;</span>;
        if (["In Progress", "Done", "Approved"].includes(part))
          return <span key={i} className="font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded text-[11px]">{part}</span>;
        if (["Queued", "Pending", "Review"].includes(part))
          return <span key={i} className="font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded text-[11px]">{part}</span>;
        if (part === "Rejected")
          return <span key={i} className="font-semibold text-red-700 bg-red-50 px-1 py-0.5 rounded text-[11px]">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync so effects always read latest values
  const categoryRef = useRef(category);
  const searchRef = useRef(searchInput);
  const dateFromRef = useRef(dateFrom);
  const dateToRef = useRef(dateTo);
  const pageRef = useRef(page);
  categoryRef.current = category;
  searchRef.current = searchInput;
  dateFromRef.current = dateFrom;
  dateToRef.current = dateTo;
  pageRef.current = page;

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchLogs = useCallback(async (silent = false) => {
    const p = pageRef.current;
    const cat = categoryRef.current;
    const q = searchRef.current;
    const from = dateFromRef.current;
    const to = dateToRef.current;

    if (!silent) setLoading(true);
    else setRefreshing(true);

    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(limit));
    if (cat !== "all") params.set("category", cat);
    if (q) params.set("search", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    try {
      const res = await fetch(`/api/logs?${params}`);
      const data = await res.json();
      if (data.logs) { setLogs(data.logs); setTotal(data.total); }
    } catch { /* silent */ } finally { setLoading(false); setRefreshing(false); }
  }, []);

  // Initial load
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Re-fetch when category or dates change (instant)
  useEffect(() => {
    setPage(1);
    pageRef.current = 1;
    fetchLogs();
  }, [category, dateFrom, dateTo, fetchLogs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      pageRef.current = 1;
      fetchLogs();
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput, fetchLogs]);

  const handlePageChange = (p: number) => {
    setPage(p);
    pageRef.current = p;
    fetchLogs();
  };

  // Auto-refresh every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => { fetchLogs(true); }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchLogs]);

  const handleClearFilters = () => {
    setCategory("all");
    setSearchInput("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    // Refs update synchronously
    categoryRef.current = "all";
    searchRef.current = "";
    dateFromRef.current = "";
    dateToRef.current = "";
    pageRef.current = 1;
    fetchLogs();
  };
  const hasFilters = searchInput || dateFrom || dateTo || category !== "all";

  if (loading && logs.length === 0) return <PageLoader />;

  const catStyle = categoryStyle[category] || categoryStyle.all;

  return (
    <>
      <Topbar title="Activity Logs" />

      <div className="p-3 sm:p-6 space-y-5">
        {/* Stats bar */}
        <div className={`rounded-2xl ${catStyle.bg} border ${catStyle.border} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${catStyle.activeBg} flex items-center justify-center shadow-lg`}>
              <Activity size={18} className="text-white" />
            </div>
            <div>
              <div className={`text-2xl font-bold ${catStyle.text}`}>{total}</div>
              <div className="text-[11px] text-gray-500 font-medium">{category === "all" ? "Total" : category.charAt(0).toUpperCase() + category.slice(1)} Logs</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${catStyle.dot} animate-pulse`} />
            <span className="text-[11px] text-gray-500">Live · 30s refresh</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.key;
            const s = categoryStyle[cat.key];
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? `${s.activeBg} text-white shadow-lg`
                    : `bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:shadow-sm`
                }`}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search + Date */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[220px] max-w-[420px] shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by message, email, name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 text-[13px] text-gray-700 outline-none bg-transparent placeholder:text-gray-400"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={14} /></button>
            )}
          </div>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <Calendar size={14} className="text-gray-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-[12px] text-gray-600 outline-none bg-transparent" />
            <ArrowRight size={12} className="text-gray-300" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-[12px] text-gray-600 outline-none bg-transparent" />
          </div>

          <button
            onClick={() => fetchLogs(true)}
            className={`p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all cursor-pointer shadow-sm ${refreshing ? "animate-spin" : ""}`}
          >
            <RefreshCw size={15} />
          </button>

          {hasFilters && (
            <button onClick={handleClearFilters} className="flex items-center gap-1 text-[12px] text-red-500 hover:text-red-600 font-semibold cursor-pointer bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Log List */}
        <div className="space-y-2">
          {logs.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-gray-200">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                <AlertCircle size={36} className="text-gray-300" />
              </div>
              <div className="text-[16px] font-semibold text-gray-500">No logs found</div>
              <div className="text-[13px] mt-1 text-gray-400">Try adjusting your filters or check back later</div>
            </div>
          )}

          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;
            const cs = categoryStyle[log.category] || categoryStyle.system;
            const es = eventStyle[log.event] || eventStyle[log.category] || "bg-gray-500";

            return (
              <div
                key={log.id}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded ? `${cs.border} shadow-md` : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div
                  onClick={() => hasMeta && setExpandedId(isExpanded ? null : log.id)}
                  className={`flex items-start sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 ${hasMeta ? "cursor-pointer" : ""}`}
                >
                  {/* Color indicator + expand */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${es} shadow-sm ring-2 ring-white`} />
                    {hasMeta && (
                      <div className="text-gray-300">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </div>
                    )}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: event + category + time */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white ${es}`}>
                        {log.event.replace(/_/g, " ")}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${cs.bg} ${cs.text} border ${cs.border}`}>
                        {log.category}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-auto font-medium" title={formatFullDate(log.createdAt)}>
                        {formatDate(log.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="text-[13px] text-gray-700 leading-relaxed">
                      <RichMessage message={log.message} />
                    </div>
                  </div>

                  {/* User */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0 min-w-[130px] justify-end">
                    {log.userName ? (
                      <>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          log.userRole ? (roleBadge[log.userRole] || "bg-gray-100 text-gray-600") : "bg-indigo-100 text-indigo-600"
                        }`}>
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] text-gray-800 font-semibold leading-tight truncate max-w-[90px]">{log.userName}</div>
                          {log.userRole && <div className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider">{log.userRole}</div>}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-400 shrink-0">S</div>
                        <div className="text-[12px] text-gray-400 italic">System</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded metadata */}
                {isExpanded && hasMeta && (
                  <div className={`mx-4 sm:mx-5 mb-4 mt-0 rounded-xl ${cs.bg} border ${cs.border} overflow-hidden`}>
                    <div className="px-4 py-2.5 border-b border-white/50 flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cs.text}`}>Details</span>
                      {log.userRole && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${roleBadge[log.userRole] || "bg-gray-100 text-gray-600"}`}>
                          {log.userRole}
                        </span>
                      )}
                      {log.userId && <span className="text-[10px] text-gray-400">ID #{log.userId}</span>}
                      <span className="text-[10px] text-gray-400 ml-auto">{formatFullDate(log.createdAt)}</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(log.metadata).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-3 bg-white/70 backdrop-blur rounded-lg px-3 py-2.5 border border-white">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider min-w-[70px] shrink-0 pt-0.5">
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-[12px] text-gray-800 font-semibold break-all">
                            {Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3.5 shadow-sm">
            <div className="text-[12px] text-gray-500">
              Showing <span className="font-bold text-gray-800">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> of <span className="font-bold text-gray-800">{total}</span>
            </div>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="px-4 py-2 text-[12px] rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-semibold transition-all"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p: number;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-9 h-9 text-[12px] rounded-lg cursor-pointer font-semibold transition-all ${
                      p === page
                        ? `${catStyle.activeBg} text-white shadow-md`
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="px-4 py-2 text-[12px] rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-semibold transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
