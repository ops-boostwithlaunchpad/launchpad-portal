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
} from "lucide-react";
import { useState } from "react";
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
      { name: "Master List", href: "/dashboard/sales/master", icon: LayoutGrid, roles: ["admin", "sales"] },
      { name: "Agency Owners", href: "/dashboard/sales/agencies", icon: Users, roles: ["admin", "sales"] },
      { name: "Agents", href: "/dashboard/sales/agents", icon: UserCheck, roles: ["admin", "sales"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Clients & Services", href: "/dashboard/clients", icon: Briefcase, roles: ["admin", "sales", "backend", "employee"] },
      { name: "Backend Board", href: "/dashboard/backend", icon: Kanban, roles: ["admin", "backend", "employee"] },
    ],
  },
  {
    label: "Management",
    items: [
      { name: "Employees", href: "/dashboard/employees", icon: Users, roles: ["admin"] },
    ],
  },
  {
    label: "Client Portal",
    items: [
      { name: "Customer View", href: "/dashboard/portal", icon: LineChart, roles: ["admin", "client"] },
    ],
  },
];

const roleBadgeColors: Record<Role, string> = {
  admin: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  sales: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  backend: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  client: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  employee: "bg-pink-500/15 text-pink-400 border-pink-500/25",
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  const role = user?.role || "admin";

  // Filter sections/items based on role
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const sidebarContent = (
    <>
      <div className="px-4 pt-4 pb-3 border-b border-[#242433]">
        <div className="text-lg font-bold font-serif text-gray-100">
          Launchpad<span className="text-indigo-400">.</span>
        </div>
        <div className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
          Ops Portal
        </div>
      </div>

      {/* User info */}
      {user && (
        <div className="px-3.5 pt-3 pb-2 border-b border-[#242433]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium truncate">{user.name}</div>
              <div className="text-[9px] text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${roleBadgeColors[role]}`}>
              {role}
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="px-2.5 pt-3 pb-1">
            <div className="text-[9px] text-gray-500 uppercase tracking-widest px-2 pb-2 font-semibold">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12.5px] mb-0.5 transition-all border ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      : "text-gray-500 border-transparent hover:bg-[#1a1a26] hover:text-gray-200"
                  }`}
                >
                  <item.icon size={14} className={isActive ? "opacity-100" : "opacity-50"} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-[#242433]">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-5 py-3 text-[12px] text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          Sign Out
        </button>
        <div className="px-3.5 py-2 border-t border-[#242433]">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <MapPin size={10} />
            Boost with Launchpad
          </div>
          <div className="text-[9px] text-gray-600 font-mono mt-0.5">
            Palm Beach Gardens, FL
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 bg-[#111118] border border-[#242433] rounded-lg p-2 text-gray-400"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-[220px] bg-[#111118] border-r border-[#242433] flex flex-col transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-[220px] min-w-[220px] bg-[#111118] border-r border-[#242433] flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
