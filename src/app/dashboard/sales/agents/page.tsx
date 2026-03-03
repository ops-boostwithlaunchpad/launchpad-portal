"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input } from "@/components/FormGroup";
import { Select } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Agent, Agency } from "@/lib/types";
import { UserCheck as UserCheckIcon, DollarSign, Star, ShieldCheck, Trash2, Pencil } from "lucide-react";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencyList, setAgencyList] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [agencyVal, setAgencyVal] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/agents").then((res) => res.json()),
      fetch("/api/agencies").then((res) => res.json()),
    ])
      .then(([agentsData, agenciesData]) => {
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setAgencyList(Array.isArray(agenciesData) ? agenciesData : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const avgMRR =
    agents.length > 0
      ? Math.round(agents.reduce((s, a) => s + a.mrr, 0) / agents.length)
      : 0;

  function resetForm() {
    setName("");
    setAgencyVal("");
    setEmail("");
    setCommission("");
    setEditTarget(null);
  }

  function openEdit(a: Agent) {
    setEditTarget(a);
    setName(a.name);
    setAgencyVal(a.agency);
    setCommission(String(a.commission));
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim() || !agencyVal) return;

    if (editTarget) {
      const res = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          name: name.trim(),
          agency: agencyVal,
          closed: editTarget.closed,
          mrr: editTarget.mrr,
          commission: Number(commission) || 0,
          month: editTarget.month,
          status: editTarget.status,
        }),
      });
      const updated = await res.json();
      setAgents(agents.map((a) => (a.id === editTarget.id ? updated : a)));
    } else {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          agency: agencyVal,
          closed: 0,
          mrr: 0,
          commission: Number(commission) || 0,
          month: 0,
          status: "Active",
        }),
      });
      const created = await res.json();
      setAgents([...agents, created]);
    }

    resetForm();
    setModalOpen(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/agents?id=${deleteTarget.id}`, { method: "DELETE" });
    setAgents(agents.filter((a) => a.id !== deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  const columns = [
    {
      key: "agent",
      header: "Agent",
      render: (a: Agent) => (
        <div className="flex items-center gap-2">
          <Avatar name={a.name} />
          <span className="font-medium text-gray-200">{a.name}</span>
        </div>
      ),
    },
    {
      key: "agency",
      header: "Agency",
      render: (a: Agent) => (
        <span className="text-gray-500">{a.agency}</span>
      ),
    },
    {
      key: "closed",
      header: "Deals Closed",
      render: (a: Agent) => <span className="text-gray-300">{a.closed}</span>,
    },
    {
      key: "mrr",
      header: "MRR",
      render: (a: Agent) => (
        <span className="text-emerald-400 font-mono font-semibold">
          ${a.mrr.toLocaleString()}
        </span>
      ),
    },
    {
      key: "commission",
      header: "Commission %",
      render: (a: Agent) => <span className="text-gray-300">{a.commission}%</span>,
    },
    {
      key: "month",
      header: "This Month",
      render: (a: Agent) => (
        <span className="text-indigo-400 font-mono font-semibold">
          ${a.month.toLocaleString()}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (a: Agent) => <StatusBadge status={a.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (a: Agent) => (
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
        <Topbar title="Sales — Agents" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Topbar title="Sales — Agents">
        <Button onClick={() => setModalOpen(true)}>+ Add Agent</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(agents.length)} label="Total Agents" icon={UserCheckIcon} iconColor="blue" />
          <StatCard
            value={`$${avgMRR.toLocaleString()}`}
            label="Avg Agent MRR"
            valueColor="green"
            icon={DollarSign}
          />
          <StatCard value="5" label="Top Performers" icon={Star} iconColor="orange" />
          <StatCard value="92%" label="Retention" icon={ShieldCheck} iconColor="teal" />
        </StatsRow>

        <Card title="All Agents">
          <DataTable columns={columns} data={agents} />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          resetForm();
          setEditTarget(null);
          setModalOpen(false);
        }}
        title={editTarget ? "Edit Agent" : "Add Agent"}
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
            <Button onClick={handleSubmit}>{editTarget ? "Save Changes" : "Add Agent"}</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup label="Agent Name">
            <Input
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Agency">
            <Select value={agencyVal} onChange={(e) => setAgencyVal(e.target.value)}>
              <option value="">Select agency...</option>
              {agencyList.map((ag) => (
                <option key={ag.id} value={ag.agency}>
                  {ag.agency}
                </option>
              ))}
            </Select>
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
              placeholder="e.g. 10"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </FormGroup>
        </FormRow>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete agent "${deleteTarget?.name ?? ""}"? This action cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}
