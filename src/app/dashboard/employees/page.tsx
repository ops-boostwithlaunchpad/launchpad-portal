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
import { Pencil, Trash2, UserPlus, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/FormGroup";

interface EmployeeRow {
  id: number;
  name: string;
  email: string;
  department: string[];
  createdAt: string;
}

const deptShortLabel: Record<string, string> = {
  "Local Service Ads": "LSA",
};

const deptBadgeColors: Record<string, string> = {
  "Local SEO": "bg-green-50 text-green-600 border-green-200",
  "AI SEO": "bg-teal-50 text-teal-600 border-teal-200",
  "Local Service Ads": "bg-orange-50 text-orange-600 border-orange-200",
  "Google Ads": "bg-yellow-50 text-yellow-600 border-yellow-200",
  "Meta Ads": "bg-purple-50 text-purple-600 border-purple-200",
  Automation: "bg-blue-50 text-blue-600 border-blue-200",
  Developer: "bg-pink-50 text-pink-600 border-pink-200",
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
  const [attempted, setAttempted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
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

  const uniqueDepts = new Set(employees.flatMap((e) => e.department));

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
    }
    if (filterDept) list = list.filter((e) => e.department.includes(filterDept));
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
    setDepartments([]);
    setEditTarget(null);
    setFormError("");
    setShowPassword(false);
    setAttempted(false);
  }

  function openEdit(emp: EmployeeRow) {
    setEditTarget(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPassword("");
    setDepartments(emp.department);
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    setAttempted(true);
    if (!name.trim() || !email.trim() || departments.length === 0) {
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
          department: departments,
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
            department: departments,
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
            <div className="font-medium text-gray-800">{emp.name}</div>
            <div className="text-[11px] text-gray-500">{emp.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      render: (emp: EmployeeRow) => (
        <div className="flex flex-wrap gap-1">
          {emp.department.map((dept) => (
            <span
              key={dept}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                deptBadgeColors[dept] || "bg-gray-50 text-gray-500 border-gray-200"
              }`}
            >
              {deptShortLabel[dept] || dept}
            </span>
          ))}
        </div>
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
      header: "",
      render: (emp: EmployeeRow) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); openAssignModal(emp); }}
            className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5"
            title="Assign Task"
          >
            <UserPlus size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(emp); }}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(emp); }}
            className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
            title="Delete"
          >
            <Trash2 size={13} />
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
          <StatCard value={String(employees.length)} label="Total Employees" />
          <StatCard value={String(uniqueDepts.size)} label="Departments" />
          <StatCard value="Active" label="All Status" />
          <StatCard value="Employee" label="Role Type" />
        </StatsRow>

        <Card title="All Employees">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search employees..." />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-indigo-500"
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
          <DataTable
            columns={columns}
            data={paginatedEmployees}
            onRowClick={openEmployeeTasks}
            mobileCard={(emp, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-3 bg-white cursor-pointer"
                onClick={() => openEmployeeTasks(emp)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={emp.name} />
                    <div>
                      <div className="font-medium text-[12.5px] text-gray-800">{emp.name}</div>
                      <div className="text-[10px] text-gray-500">{emp.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {emp.department.map((dept) => (
                      <span key={dept} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${deptBadgeColors[dept] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                        {deptShortLabel[dept] || dept}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    Joined {new Date(emp.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openAssignModal(emp)} className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5" title="Assign Task"><UserPlus size={13} /></button>
                    <button onClick={() => openEdit(emp)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(emp)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            )}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-[11px] text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 cursor-pointer"
                >
                  &#8249;
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 cursor-pointer"
                >
                  &#8250;
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
            <Button onClick={handleSubmit} loading={saving}>
              {editTarget ? "Save Changes" : "Add Employee"}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[12px]">
            {formError}
          </div>
        )}
        <FormRow>
          <FormGroup label="Full Name" required>
            <Input
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={attempted && !name.trim()}
            />
          </FormGroup>
          <FormGroup label="Email" required>
            <Input
              type="email"
              placeholder="john@launchpadboost.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={attempted && !email.trim()}
            />
          </FormGroup>
        </FormRow>
        <FormGroup label={editTarget ? "New Password (leave blank to keep)" : "Password"}>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={editTarget ? "Leave blank to keep current" : "Enter password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={attempted && !editTarget && !password.trim()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </FormGroup>
        <FormGroup label="Departments" required>
          <div className={`flex flex-wrap gap-2 mt-1 p-2 rounded-lg border ${attempted && departments.length === 0 ? "border-red-300 bg-red-50/50" : "border-gray-200 bg-gray-50/50"}`}>
            {DEPARTMENTS.map((d) => (
              <Checkbox
                key={d}
                label={deptShortLabel[d] || d}
                checked={departments.includes(d)}
                onChange={() => setDepartments((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
              />
            ))}
          </div>
          {attempted && departments.length === 0 && (
            <p className="text-[10px] text-red-500 mt-1">Select at least one department</p>
          )}
        </FormGroup>
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
            <Button onClick={handleAssignTask} disabled={!selectedTaskId} loading={assigning}>
              Assign Task
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
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <ServiceBadge service={task.service} />
                      <PrioBadge priority={task.priority} />
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Team: {task.team}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Due: {task.due}
                    </div>
                    {task.notes && (
                      <div className="text-[11px] text-gray-400 mt-1 truncate">
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
              <div className="flex gap-0.5 bg-gray-50 border border-gray-200 rounded-lg p-0.5 w-fit mb-3 overflow-x-auto max-w-full">
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
                        : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                    <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold ${
                      empTaskTab === tab.key ? "bg-white/80 text-black" : "bg-gray-200 text-gray-500"
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
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-medium text-gray-800">{task.client}</span>
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
