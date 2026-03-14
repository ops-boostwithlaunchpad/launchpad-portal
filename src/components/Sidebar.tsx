"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Users,
  UserCheck,
  Briefcase,
  Kanban,
  LineChart,
  MapPin,
  Menu,
  X,
  LogOut,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  XCircle,
  ShieldCheck,
  ClipboardCheck,
  ScrollText,
  MessagesSquare,
  Headset,
} from "lucide-react";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRealtimeMessages } from "@/hooks/useRealtimeChat";
import { useRealtimeClientMessages } from "@/hooks/useRealtimeClientChat";
import type { Role } from "@/lib/types";

function useUnseenIndicator(role: Role, key: string, checkFn: () => Promise<boolean>) {
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    if (role !== "admin" && role !== "subadmin") return;

    const check = async () => {
      try {
        setHasUnseen(await checkFn());
      } catch { /* ignore */ }
    };

    check();
    const interval = setInterval(check, 30000);

    // Listen for "mark as seen" events from the page
    const onSeen = () => setHasUnseen(false);
    window.addEventListener(`lp_seen_${key}`, onSeen);

    return () => {
      clearInterval(interval);
      window.removeEventListener(`lp_seen_${key}`, onSeen);
    };
  }, [role, key, checkFn]);

  return hasUnseen;
}

function useUnreadChatCount(role: Role) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/task-messages/unread");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (role !== "admin" && role !== "subadmin" && role !== "employee") return;
    fetchCount();
    // Fallback polling in case Realtime is not enabled on the table
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [role, fetchCount]);

  // Realtime: refetch instantly when any message is inserted/updated
  useRealtimeMessages("sidebar-unread", fetchCount);

  return count;
}

function useUnreadClientChatCount(role: Role) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/client-messages/unread");
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.count || 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (role !== "admin" && role !== "subadmin" && role !== "client") return;
    fetchCount();
  }, [role, fetchCount]);

  // Realtime: refetch instantly when any client message is inserted/updated
  useRealtimeClientMessages("sidebar-client-unread", fetchCount);

  return count;
}

function useUnseenLogs(role: Role) {
  const checkFn = useCallback(async () => {
    const lastSeen = localStorage.getItem("lp_logs_last_seen");
    if (!lastSeen) return true; // never visited = show pulse
    const res = await fetch(`/api/logs?limit=1&from=${encodeURIComponent(lastSeen)}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.total > 0;
  }, []);

  return useUnseenIndicator(role, "logs", checkFn);
}

function useUnseenApprovals(role: Role) {
  const checkFn = useCallback(async () => {
    const lastSeen = localStorage.getItem("lp_approvals_last_seen");
    const res = await fetch("/api/approvals/unseen" + (lastSeen ? `?since=${encodeURIComponent(lastSeen)}` : ""));
    if (!res.ok) return false;
    const data = await res.json();
    return data.count > 0;
  }, []);

  return useUnseenIndicator(role, "approvals", checkFn);
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutGrid;
  roles: Role[]; // which roles can see this item
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Sales",
    items: [
      { name: "Master List", href: "/dashboard/sales/master", icon: LayoutGrid, roles: ["admin", "subadmin", "sales", "agent", "agency"] },
      { name: "Agency Owners", href: "/dashboard/sales/agencies", icon: Users, roles: ["admin", "subadmin", "sales"] },
      { name: "Agents", href: "/dashboard/sales/agents", icon: UserCheck, roles: ["admin", "subadmin", "sales", "agency"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Clients & Services", href: "/dashboard/clients", icon: Briefcase, roles: ["admin", "subadmin", "sales", "backend"] },
      { name: "Backend Board", href: "/dashboard/backend", icon: Kanban, roles: ["admin", "subadmin", "backend"] },
      { name: "Ongoing Tasks", href: "/dashboard/ongoing-tasks", icon: MessagesSquare, roles: ["admin", "subadmin"] },
      { name: "Client Messages", href: "/dashboard/client-chats", icon: Headset, roles: ["admin", "subadmin"] },
      { name: "My Tasks", href: "/dashboard/my-tasks", icon: ClipboardList, roles: ["employee"] },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck, roles: ["admin", "subadmin"] },
      { name: "Employees", href: "/dashboard/employees", icon: Users, roles: ["admin", "subadmin"] },
      { name: "Sub Admins", href: "/dashboard/sub-admins", icon: ShieldCheck, roles: ["admin"] },
      { name: "Logs", href: "/dashboard/logs", icon: ScrollText, roles: ["admin", "subadmin"] },
    ],
  },
  {
    label: "Client Portal",
    items: [
      { name: "Customer View", href: "/dashboard/portal", icon: LineChart, roles: ["admin", "subadmin", "client"] },
      { name: "Contact Admin", href: "/dashboard/contact-admin", icon: Headset, roles: ["client"] },
      { name: "Cancel Services", href: "/dashboard/cancel", icon: XCircle, roles: ["client"] },
    ],
  },
];

const roleBadgeColors: Record<Role, string> = {
  admin: "bg-indigo-50 text-indigo-600 border-indigo-200",
  subadmin: "bg-sky-50 text-sky-600 border-sky-200",
  sales: "bg-emerald-50 text-emerald-600 border-emerald-200",
  backend: "bg-amber-50 text-amber-600 border-amber-200",
  client: "bg-cyan-50 text-cyan-600 border-cyan-200",
  employee: "bg-pink-50 text-pink-600 border-pink-200",
  agent: "bg-violet-50 text-violet-600 border-violet-200",
  agency: "bg-orange-50 text-orange-600 border-orange-200",
};

// Context for sidebar collapsed state
const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const role = user?.role || "admin";
  const hasUnseenLogs = useUnseenLogs(role);
  const hasUnseenApprovals = useUnseenApprovals(role);
  const unreadChatCount = useUnreadChatCount(role);
  const unreadClientChatCount = useUnreadClientChatCount(role);

  // Filter sections/items based on role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.roles.includes(role))
        .map((item) => {
          if ((role === "agency" || role === "agent") && item.name === "Master List") {
            return { ...item, name: "Sales" };
          }
          return item;
        }),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (isMobile: boolean) => (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={`text-lg font-bold font-serif text-gray-900 ${!isMobile && collapsed ? "hidden" : ""}`}>
            Launchpad<span className="text-indigo-500">.</span>
          </div>
          {!isMobile && collapsed && (
            <div className="text-lg font-bold font-serif text-indigo-500 mx-auto">L</div>
          )}
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>
        {(!collapsed || isMobile) && (
          <div className="text-[9px] text-gray-400 uppercase tracking-widest mt-0.5">
            Ops Portal
          </div>
        )}
      </div>

      {/* User info */}
      {user && (!collapsed || isMobile) && (
        <div className="px-3.5 pt-3 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-gray-800 truncate">{user.name}</div>
              <div className="text-[9px] text-gray-400 truncate">{user.email}</div>
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${roleBadgeColors[role]}`}>
              {role}
            </span>
          </div>
        </div>
      )}

      {user && collapsed && !isMobile && (
        <div className="px-2 pt-3 pb-2 border-b border-gray-200 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[11px] font-bold">
            {user.name.charAt(0)}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="px-2.5 pt-3 pb-1">
            {(!collapsed || isMobile) && (
              <div className="text-[9px] text-gray-400 uppercase tracking-widest px-2 pb-2 font-semibold">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed && !isMobile ? item.name : undefined}
                  className={`flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-2.5"} px-2 py-1.5 rounded-lg text-[12.5px] mb-0.5 transition-all border ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600 border-indigo-200"
                      : "text-gray-500 border-transparent hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  <item.icon size={14} className={isActive ? "opacity-100" : "opacity-50"} />
                  {(!collapsed || isMobile) && item.name}
                  {item.name === "Logs" && hasUnseenLogs && !isActive && (
                    <span className="relative ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                    </span>
                  )}
                  {item.name === "Approvals" && hasUnseenApprovals && !isActive && (
                    <span className="relative ml-auto flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  )}
                  {(item.name === "Ongoing Tasks" || item.name === "My Tasks") && unreadChatCount > 0 && (item.name === "My Tasks" || !isActive) && (!collapsed || isMobile) && (
                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold bg-orange-500 text-white">
                      {unreadChatCount > 99 ? "99+" : unreadChatCount}
                    </span>
                  )}
                  {(item.name === "Ongoing Tasks" || item.name === "My Tasks") && unreadChatCount > 0 && (item.name === "My Tasks" || !isActive) && collapsed && !isMobile && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-orange-500" />
                  )}
                  {(item.name === "Client Messages" || item.name === "Contact Admin") && unreadClientChatCount > 0 && !isActive && (!collapsed || isMobile) && (
                    <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold bg-cyan-500 text-white">
                      {unreadClientChatCount > 99 ? "99+" : unreadClientChatCount}
                    </span>
                  )}
                  {(item.name === "Client Messages" || item.name === "Contact Admin") && unreadClientChatCount > 0 && !isActive && collapsed && !isMobile && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-cyan-500" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-gray-200">
        <button
          onClick={logout}
          className={`w-full flex items-center ${collapsed && !isMobile ? "justify-center" : "gap-2.5"} px-5 py-3 text-[12px] text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer`}
        >
          <LogOut size={13} />
          {(!collapsed || isMobile) && "Sign Out"}
        </button>
        {(!collapsed || isMobile) && (
          <div className="px-3.5 py-2 border-t border-gray-200">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <MapPin size={10} />
              Boost with Launchpad
            </div>
            <div className="text-[9px] text-gray-400 font-mono mt-0.5">
              Palm Beach Gardens, FL
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      {/* Mobile toggle — only show hamburger when sidebar is closed */}
      {!mobileOpen && (
        <button
          className="lg:hidden fixed top-2.5 left-3 z-50 p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white border border-gray-200 rounded-md"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-[220px] bg-white border-r border-gray-200 flex flex-col transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent(true)}
      </aside>

      {/* Sidebar - desktop */}
      <aside className={`hidden lg:flex ${collapsed ? "w-[64px] min-w-[64px]" : "w-[220px] min-w-[220px]"} bg-white border-r border-gray-200 flex-col h-screen sticky top-0 transition-all duration-200 relative z-40`}>
        {sidebarContent(false)}
        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm cursor-pointer z-10"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </SidebarContext.Provider>
  );
}
