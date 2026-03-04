"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Avatar } from "@/components/Avatar";
import { DEPARTMENTS } from "@/lib/types";
import { Users, UserPlus, Building2, Shield, Trash2, Pencil, Eye, EyeOff } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const uniqueDepts = new Set(employees.map((e) => e.department));

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
            onClick={() => openEdit(emp)}
            className="text-gray-600 hover:text-indigo-400 transition-colors p-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteTarget(emp)}
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
          <DataTable columns={columns} data={employees} />
        </Card>
      </div>

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
