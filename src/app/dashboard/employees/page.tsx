"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Avatar } from "@/components/Avatar";
import { StatusBadge, PrioBadge, ServiceBadge } from "@/components/Badge";
import { DEPARTMENTS } from "@/lib/types";
import type { Task, Client } from "@/lib/types";
import {
  Users, UserPlus, Building2, Shield, Trash2, Pencil, Eye, EyeOff,
  ClipboardList, X, ChevronLeft, ChevronRight,
} from "lucide-react";

interface EmployeeRow {
  id: number;
  name: string;
  email: string;
  password: string;
  department: string;
  createdAt: string;
}

const deptBadgeColors: Record<string, string> = {
  "Local SEO": "bg-green-500/15 text-green-400 border-green-500/25",
  "AI SEO": "bg-teal-500/15 text-teal-400 border-teal-500/25",
  "Local Service Ads": "bg-orange-500/15 text-orange-400 border-orange-500/25",
  "Google Ads": "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  "Meta Ads": "bg-purple-500/15 text-purple-400 border-purple-500/25",
  Automation: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Developer: "bg-pink-500/15 text-pink-400 border-pink-500/25",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Assign Task modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignEmployee, setAssignEmployee] = useState<EmployeeRow | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [queuedTasks, setQueuedTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Search, filter & pagination
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Employee tasks viewer modal state
  const [viewTasksEmployee, setViewTasksEmployee] = useState<EmployeeRow | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<Task[]>([]);
  const [loadingEmpTasks, setLoadingEmpTasks] = useState(false);
  const [empTaskTab, setEmpTaskTab] = useState("Queue");

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const uniqueDepts = new Set(employees.map((e) => e.department));

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
    }
    if (filterDept) list = list.filter((e) => e.department === filterDept);
    return list;
  }, [employees, search, filterDept]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PER_PAGE));
  const paginatedEmployees = filteredEmployees.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterDept]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setDepartment("");
    setEditTarget(null);
    setFormError("");
    setShowPassword(false);
  }

  function openEdit(emp: EmployeeRow) {
    setEditTarget(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPassword("");
    setDepartment(emp.department);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !department) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!editTarget && !password.trim()) {
      setFormError("Password is required for new employees.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editTarget) {
        const body: Record<string, unknown> = {
          id: editTarget.id,
          name: name.trim(),
          email: email.trim(),
          department,
        };
        if (password.trim()) body.password = password.trim();

        const res = await fetch("/api/employees", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to update employee");
          return;
        }
        const updated = await res.json();
        setEmployees(employees.map((e) => (e.id === editTarget.id ? updated : e)));
      } else {
        const res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            department,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to create employee");
          return;
        }
        const created = await res.json();
        setEmployees([created, ...employees]);
      }

      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/employees?id=${deleteTarget.id}`, { method: "DELETE" });
    setEmployees(employees.filter((e) => e.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  // --- Assign Task ---
  async function openAssignModal(emp: EmployeeRow) {
    setAssignEmployee(emp);
    setSelectedClient("");
    setQueuedTasks([]);
    setSelectedTaskId(null);
    setAssignModalOpen(true);

    // Fetch clients
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(Array.isArray(data) ? data.filter((c: Client) => c.status === "Active") : []);
  }

  async function handleClientSelect(clientName: string) {
    setSelectedClient(clientName);
    setSelectedTaskId(null);
    if (!clientName) {
      setQueuedTasks([]);
      return;
    }
    setLoadingTasks(true);
    const res = await fetch(`/api/tasks?status=Queued`);
    const data: Task[] = await res.json();
    // Filter by client name and only unassigned tasks
    setQueuedTasks(data.filter((t) => t.client === clientName && !t.assignedTo));
    setLoadingTasks(false);
  }

  async function handleAssignTask() {
    if (!assignEmployee || !selectedTaskId) return;
    setAssigning(true);
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedTaskId,
        assignedTo: assignEmployee.id,
        assignedToName: assignEmployee.name,
      }),
    });

    setAssigning(false);
    setAssignModalOpen(false);
    setAssignEmployee(null);
  }

  // --- View Employee Tasks ---
  async function openEmployeeTasks(emp: EmployeeRow) {
    setViewTasksEmployee(emp);
    setLoadingEmpTasks(true);
    const res = await fetch(`/api/tasks?assignedTo=${emp.id}`);
    const data = await res.json();
    setEmployeeTasks(Array.isArray(data) ? data : []);
    setLoadingEmpTasks(false);
  }

  const columns = [
    {
      key: "name",
      header: "Employee",
      render: (emp: EmployeeRow) => (
        <div className="flex items-center gap-2">
          <Avatar name={emp.name} />
          <div>
            <div className="font-medium text-gray-200">{emp.name}</div>
            <div className="text-[11px] text-gray-500">{emp.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (emp: EmployeeRow) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            deptBadgeColors[emp.department] || "bg-gray-500/15 text-gray-400 border-gray-500/25"
          }`}
        >
          {emp.department}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      render: (emp: EmployeeRow) => (
        <span className="text-gray-500 text-[11px]">
          {new Date(emp.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (emp: EmployeeRow) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openAssignModal(emp); }}
            className="text-gray-600 hover:text-emerald-400 transition-colors p-1"
            title="Assign Task"
          >
            <ClipboardList size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
            className="text-gray-600 hover:text-indigo-400 transition-colors p-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(emp); }}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <>
        <Topbar title="Employees" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Topbar title="Employee Management">
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>+ Add Employee</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(employees.length)} label="Total Employees" icon={Users} iconColor="blue" />
          <StatCard value={String(uniqueDepts.size)} label="Departments" icon={Building2} iconColor="teal" />
          <StatCard value="Active" label="All Status" icon={Shield} iconColor="green" />
          <StatCard value="Employee" label="Role Type" icon={UserPlus} iconColor="orange" />
        </StatsRow>

        <Card title="All Employees">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-[#09090f] border border-[#242433] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-300 outline-none focus:border-indigo-500"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="text-[11px] text-gray-500 ml-auto">
              {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
            </span>
          </div>
          <DataTable columns={columns} data={paginatedEmployees} onRowClick={openEmployeeTasks} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#242433]">
              <span className="text-[11px] text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-[#242433] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-[#242433] disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Employee Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        title={editTarget ? "Edit Employee" : "Add Employee"}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Add Employee"}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[12px]">
            {formError}
          </div>
        )}
        <FormRow>
          <FormGroup label="Full Name">
            <Input
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Email">
            <Input
              type="email"
              placeholder="john@launchpadboost.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label={editTarget ? "New Password (leave blank to keep)" : "Password"}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={editTarget ? "Leave blank to keep current" : "Enter password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </FormGroup>
          <FormGroup label="Department">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select department...</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>
      </Modal>

      {/* Assign Task Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setAssignEmployee(null); }}
        title={`Assign Task to ${assignEmployee?.name ?? ""}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => { setAssignModalOpen(false); setAssignEmployee(null); }}>
              Cancel
            </Button>
            <Button onClick={handleAssignTask} disabled={!selectedTaskId || assigning}>
              {assigning ? "Assigning..." : "Assign Task"}
            </Button>
          </>
        }
      >
        <FormGroup label="Select Client">
          <Select value={selectedClient} onChange={(e) => handleClientSelect(e.target.value)}>
            <option value="">Choose a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </FormGroup>

        {selectedClient && (
          <div className="mt-4">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Queued Tasks for {selectedClient}
            </div>
            {loadingTasks ? (
              <div className="text-center text-gray-500 text-xs py-4">Loading tasks...</div>
            ) : queuedTasks.length === 0 ? (
              <div className="text-center text-gray-500 text-xs py-4">No queued tasks available for this client.</div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {queuedTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTaskId === task.id
                        ? "border-indigo-500/50 bg-indigo-500/10"
                        : "border-[#242433] bg-[#0d0d14] hover:border-[#363648]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <ServiceBadge service={task.service} />
                      <PrioBadge priority={task.priority} />
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Team: {task.team}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Due: {task.due}
                    </div>
                    {task.notes && (
                      <div className="text-[11px] text-gray-600 mt-1 truncate">
                        {task.notes}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* View Employee Tasks Modal */}
      <Modal
        open={!!viewTasksEmployee}
        onClose={() => { setViewTasksEmployee(null); setEmployeeTasks([]); setEmpTaskTab("Queue"); }}
        title={`Tasks — ${viewTasksEmployee?.name ?? ""}`}
      >
        {loadingEmpTasks ? (
          <div className="text-center text-gray-500 text-xs py-6">Loading tasks...</div>
        ) : (() => {
          const queueCount = employeeTasks.filter((t) => t.status === "Queued").length;
          const progressCount = employeeTasks.filter((t) => t.status === "In Progress").length;
          const doneCount = employeeTasks.filter((t) => t.status === "Done").length;
          const filtered = employeeTasks.filter((t) => {
            if (empTaskTab === "Queue") return t.status === "Queued";
            if (empTaskTab === "Progress") return t.status === "In Progress";
            return t.status === "Done";
          });

          return (
            <>
              <div className="flex gap-0.5 bg-[#09090f] border border-[#242433] rounded-lg p-0.5 w-fit mb-3 overflow-x-auto max-w-full">
                {([
                  { key: "Queue", label: "Queue", count: queueCount },
                  { key: "Progress", label: "Progress", count: progressCount },
                  { key: "Completed", label: "Completed", count: doneCount },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setEmpTaskTab(tab.key)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      empTaskTab === tab.key
                        ? "bg-indigo-500 text-white font-semibold"
                        : "text-gray-500 hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold ${
                      empTaskTab === tab.key ? "bg-white/20 text-white" : "bg-[#242433] text-gray-400"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-6">
                  No {empTaskTab === "Queue" ? "queued" : empTaskTab === "Progress" ? "in-progress" : "completed"} tasks.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto">
                  {filtered.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border border-[#242433] bg-[#0d0d14]"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-medium text-gray-200">{task.client}</span>
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <ServiceBadge service={task.service} />
                        <PrioBadge priority={task.priority} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-gray-500">Team: {task.team}</span>
                        <span className="text-[11px] text-gray-500">Due: {task.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete employee "${deleteTarget?.name ?? ""}"? They will no longer be able to log in.`}
        loading={deleting}
      />
    </>
  );
}
