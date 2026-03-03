"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Textarea } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Agency } from "@/lib/types";
import { Building2, DollarSign, Users as UsersIcon, TrendingUp, Trash2, Pencil } from "lucide-react";

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agency | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/agencies")
      .then((res) => res.json())
      .then((data) => setAgencies(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const totalMRR = agencies.reduce((s, a) => s + a.mrr, 0);
  const totalAgents = agencies.reduce((s, a) => s + a.agents, 0);

  function resetForm() {
    setName("");
    setAgency("");
    setEmail("");
    setCommission("");
    setNotes("");
    setEditTarget(null);
  }

  function openEdit(a: Agency) {
    setEditTarget(a);
    setName(a.name);
    setAgency(a.agency);
    setCommission(String(a.commission));
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim() || !agency.trim()) return;

    if (editTarget) {
      const res = await fetch("/api/agencies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          name: name.trim(),
          agency: agency.trim(),
          commission: Number(commission) || 0,
        }),
      });
      const updated = await res.json();
      setAgencies(agencies.map((a) => (a.id === editTarget.id ? updated : a)));
    } else {
      const res = await fetch("/api/agencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          agency: agency.trim(),
          agents: 0,
          clients: 0,
          mrr: 0,
          commission: Number(commission) || 0,
          status: "Onboarding",
        }),
      });
      const created = await res.json();
      setAgencies([...agencies, created]);
    }

    resetForm();
    setEditTarget(null);
    setModalOpen(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/agencies?id=${deleteTarget.id}`, { method: "DELETE" });
    setAgencies(agencies.filter((a) => a.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "owner",
      header: "Owner",
      render: (a: Agency) => (
        <div className="flex items-center gap-2">
          <Avatar name={a.name} />
          <span className="font-medium text-gray-200">{a.name}</span>
        </div>
      ),
    },
    {
      key: "agency",
      header: "Agency",
      render: (a: Agency) => <span className="text-gray-300">{a.agency}</span>,
    },
    {
      key: "agents",
      header: "Agents",
      render: (a: Agency) => <span className="text-gray-300">{a.agents}</span>,
    },
    {
      key: "clients",
      header: "Clients",
      render: (a: Agency) => <span className="text-gray-300">{a.clients}</span>,
    },
    {
      key: "mrr",
      header: "MRR",
      render: (a: Agency) => (
        <span className="text-emerald-400 font-mono font-semibold">
          ${a.mrr.toLocaleString()}
        </span>
      ),
    },
    {
      key: "commission",
      header: "Commission %",
      render: (a: Agency) => <span className="text-gray-300">{a.commission}%</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (a: Agency) => <StatusBadge status={a.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (a: Agency) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(a)}
            className="text-gray-600 hover:text-indigo-400 transition-colors p-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteTarget(a)}
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
        <Topbar title="Sales — Agency Owners" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Topbar title="Sales — Agency Owners">
        <Button onClick={() => setModalOpen(true)}>+ Add Agency</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(agencies.length)} label="Agency Partners" icon={Building2} iconColor="blue" />
          <StatCard
            value={`$${totalMRR.toLocaleString()}`}
            label="Agency MRR"
            valueColor="green"
            icon={DollarSign}
          />
          <StatCard value={String(totalAgents)} label="Total Agents" icon={UsersIcon} iconColor="purple" />
          <StatCard value="4.2x" label="Avg ROI" icon={TrendingUp} iconColor="teal" />
        </StatsRow>

        <Card title="All Agencies">
          <DataTable columns={columns} data={agencies} />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setEditTarget(null);
          setModalOpen(false);
        }}
        title={editTarget ? "Edit Agency" : "Add Agency"}
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
            <Button onClick={handleSubmit}>{editTarget ? "Save Changes" : "Add Agency"}</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup label="Owner Name">
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Agency Name">
            <Input
              placeholder="Agency name"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            />
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Email">
            <Input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Commission %">
            <Input
              type="number"
              placeholder="e.g. 12"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </FormGroup>
        </FormRow>
        <FormGroup label="Notes">
          <Textarea
            placeholder="Additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormGroup>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete "${deleteTarget?.agency ?? ""}"? This action cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}
