"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Avatar } from "@/components/Avatar";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface SubAdminRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export default function SubAdminsPage() {
  const [subAdmins, setSubAdmins] = useState<SubAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SubAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubAdminRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [attempted, setAttempted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Search & pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  useEffect(() => {
    fetch("/api/sub-admins")
      .then((res) => res.json())
      .then((data) => setSubAdmins(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filteredSubAdmins = useMemo(() => {
    if (!search) return subAdmins;
    const q = search.toLowerCase();
    return subAdmins.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [subAdmins, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSubAdmins.length / PER_PAGE));
  const paginatedSubAdmins = filteredSubAdmins.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  function resetForm() {
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setEditTarget(null);
    setFormError("");
    setShowPassword(false);
    setAttempted(false);
  }

  function openEdit(sa: SubAdminRow) {
    setEditTarget(sa);
    setName(sa.name);
    setEmail(sa.email);
    setPassword("");
    setPhone(sa.phone || "");
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    setAttempted(true);
    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    if (!editTarget && !password.trim()) {
      setFormError("Password is required for new sub-admins.");
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
          phone: phone.trim() || null,
        };
        if (password.trim()) body.password = password.trim();

        const res = await fetch("/api/sub-admins", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to update sub-admin");
          return;
        }
        const updated = await res.json();
        setSubAdmins(subAdmins.map((s) => (s.id === editTarget.id ? updated : s)));
      } else {
        const res = await fetch("/api/sub-admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password.trim(),
            phone: phone.trim() || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setFormError(err.error || "Failed to create sub-admin");
          return;
        }
        const created = await res.json();
        setSubAdmins([created, ...subAdmins]);
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
    await fetch(`/api/sub-admins?id=${deleteTarget.id}`, { method: "DELETE" });
    setSubAdmins(subAdmins.filter((s) => s.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "name",
      header: "Sub Admin",
      render: (sa: SubAdminRow) => (
        <div className="flex items-center gap-2">
          <Avatar name={sa.name} />
          <div>
            <div className="font-medium text-gray-800">{sa.name}</div>
            <div className="text-[11px] text-gray-500">{sa.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (sa: SubAdminRow) => (
        <span className="text-gray-500 text-[12px]">{sa.phone || "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-sky-50 text-sky-600 border-sky-200">
          Sub Admin
        </span>
      ),
    },
    {
      key: "joined",
      header: "Added",
      render: (sa: SubAdminRow) => (
        <span className="text-gray-500 text-[11px]">
          {new Date(sa.createdAt).toLocaleDateString("en-US", {
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
      render: (sa: SubAdminRow) => (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(sa); }}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(sa); }}
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
        <Topbar title="Sub Admins" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Topbar title="Sub Admin Management">
        <Button onClick={() => { resetForm(); setModalOpen(true); }}>+ Add Sub Admin</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(subAdmins.length)} label="Total Sub Admins" />
          <StatCard value="Active" label="All Status" />
          <StatCard value="Sub Admin" label="Role Type" />
        </StatsRow>

        <Card title="All Sub Admins">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search sub-admins..." />
            <span className="text-[11px] text-gray-500 ml-auto">
              {filteredSubAdmins.length} sub-admin{filteredSubAdmins.length !== 1 ? "s" : ""}
            </span>
          </div>
          <DataTable
            columns={columns}
            data={paginatedSubAdmins}
            mobileCard={(sa, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={sa.name} />
                    <div>
                      <div className="font-medium text-[12.5px] text-gray-800">{sa.name}</div>
                      <div className="text-[10px] text-gray-500">{sa.email}</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-sky-50 text-sky-600 border-sky-200">
                    Sub Admin
                  </span>
                </div>
                {sa.phone && (
                  <div className="text-[11px] text-gray-500 mb-1">Phone: {sa.phone}</div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    Added {new Date(sa.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(sa)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTarget(sa)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>
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

      {/* Add/Edit Sub Admin Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setModalOpen(false);
        }}
        title={editTarget ? "Edit Sub Admin" : "Add Sub Admin"}
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
              {editTarget ? "Save Changes" : "Add Sub Admin"}
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
              placeholder="john@boostwithlaunchpad.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={attempted && !email.trim()}
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
          <FormGroup label="Phone (optional)">
            <Input
              type="tel"
              placeholder="e.g. (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormGroup>
        </FormRow>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete sub-admin "${deleteTarget?.name ?? ""}"? They will no longer be able to log in.`}
        loading={deleting}
      />
    </>
  );
}
