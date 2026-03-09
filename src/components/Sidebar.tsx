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
} from "lucide-react";
import { useState, createContext, useContext } from "react";
import { useAuth } from "@/lib/AuthContext";
import type { Role } from "@/lib/types";

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
      { name: "My Tasks", href: "/dashboard/my-tasks", icon: ClipboardList, roles: ["employee"] },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Approvals", href: "/dashboard/approvals", icon: ClipboardCheck, roles: ["admin", "subadmin"] },
      { name: "Employees", href: "/dashboard/employees", icon: Users, roles: ["admin", "subadmin"] },
      { name: "Sub Admins", href: "/dashboard/sub-admins", icon: ShieldCheck, roles: ["admin"] },
    ],
  },
  {
    label: "Client Portal",
    items: [
      { name: "Customer View", href: "/dashboard/portal", icon: LineChart, roles: ["admin", "subadmin", "client"] },
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
