"use client";

import { useState, useEffect } from "react";
import { Trash2, Pencil, DollarSign, Flame, Hash, Target } from "lucide-react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { Badge, StageBadge, ServiceBadges } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select, Checkbox } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Deal, INDUSTRIES, SERVICE_OPTIONS } from "@/lib/types";

const STAGES: Deal["stage"][] = ["Prospect", "Proposal", "Negotiation", "Won", "Lost"];

const emptyForm = {
  client: "",
  industry: "",
  agent: "",
  services: [] as string[],
  mrr: "",
  stage: "Prospect" as Deal["stage"],
  close: "",
};

export default function SalesMasterPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- fetch deals on mount ---------- */
  useEffect(() => {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => {
        setDeals(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---------- derived ---------- */
  const confirmedMrr = deals
    .filter((d) => d.stage === "Won")
    .reduce((sum, d) => sum + d.mrr, 0);

  const filtered = deals.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.client.toLowerCase().includes(q) ||
      d.industry.toLowerCase().includes(q) ||
      d.agent.toLowerCase().includes(q);
    const matchesStage = !stageFilter || d.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  /* ---------- handlers ---------- */
  function toggleService(svc: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s) => s !== svc)
        : [...prev.services, svc],
    }));
  }

  function openEdit(d: Deal) {
    setEditTarget(d);
    setForm({
      client: d.client,
      industry: d.industry,
      agent: d.agent,
      services: [...d.services],
      mrr: String(d.mrr),
      stage: d.stage,
      close: d.close,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.client || !form.industry || !form.mrr) return;
    const body = {
      ...(editTarget ? { id: editTarget.id } : {}),
      client: form.client,
      industry: form.industry,
      agent: form.agent || "Direct",
      services: form.services.length > 0 ? form.services : ["Local SEO"],
      mrr: Number(form.mrr),
      stage: form.stage,
      close: form.close || new Date().toISOString().slice(0, 10),
    };
    const res = await fetch("/api/deals", {
      method: editTarget ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      if (editTarget) {
        setDeals((prev) => prev.map((d) => (d.id === saved.id ? saved : d)));
      } else {
        setDeals((prev) => [...prev, saved]);
      }
    }
    setModalOpen(false);
    setEditTarget(null);
    setForm(emptyForm);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/deals?id=${deleteTarget.id}`, { method: "DELETE" });
    setDeals((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  /* ---------- table columns ---------- */
  const columns = [
    {
      key: "client",
      header: "Client",
      render: (d: Deal) => (
        <div className="flex items-center gap-2">
          <Avatar name={d.client} size="sm" />
          <span className="font-medium text-gray-200">{d.client}</span>
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (d: Deal) => <span className="text-gray-500">{d.industry}</span>,
    },
    {
      key: "agent",
      header: "Agency / Agent",
      render: (d: Deal) => <span className="text-gray-500">{d.agent}</span>,
    },
    {
      key: "services",
      header: "Services",
      render: (d: Deal) => <ServiceBadges services={d.services} />,
    },
    {
      key: "mrr",
      header: "MRR",
      render: (d: Deal) => (
        <span className="text-emerald-400 font-mono">
          ${d.mrr.toLocaleString()}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      render: (d: Deal) => <StageBadge stage={d.stage} />,
    },
    {
      key: "close",
      header: "Close Date",
      render: (d: Deal) => (
        <span className="font-mono text-gray-500">{d.close}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (d: Deal) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(d)}
            className="text-gray-600 hover:text-indigo-400 transition-colors p-1"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteTarget(d)}
            className="text-gray-600 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  /* ---------- render ---------- */
  if (loading) {
    return (
      <>
        <Topbar title="Sales — Master List" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      {/* top bar */}
      <Topbar title="Sales — Master List">
        <SearchInput value={search} onChange={setSearch} placeholder="Search deals..." />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-[#09090f] border border-[#242433] rounded-lg px-2.5 py-1.5 text-[12px] text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button onClick={() => setModalOpen(true)}>+ New Deal</Button>
      </Topbar>

      {/* content */}
      <div className="p-4 md:p-6 space-y-5">
        {/* stats */}
        <StatsRow>
          <StatCard
            value={`$${confirmedMrr.toLocaleString()}`}
            label="Confirmed MRR"
            sub="↑ 18% this month"
            trend="up"
            valueColor="green"
            icon={DollarSign}
          />
          <StatCard
            value="$20K"
            label="Priority Pipeline"
            sub="Hot — Medical Practice"
            icon={Flame}
            iconColor="orange"
          />
          <StatCard
            value={String(deals.length)}
            label="Total Deals"
            icon={Hash}
            iconColor="blue"
          />
          <StatCard
            value="68%"
            label="Close Rate"
            sub="↑ vs last quarter"
            trend="up"
            icon={Target}
            iconColor="purple"
          />
        </StatsRow>

        {/* table */}
        <Card title="All Deals">
          <DataTable columns={columns} data={filtered} />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); }}
        title={editTarget ? "Edit Deal" : "Add New Deal"}
        actions={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editTarget ? "Save Changes" : "Add Deal"}</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup label="Client Name">
            <Input
              placeholder="e.g. Acme Corp"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="Industry">
            <Select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>

        <FormGroup label="Agent">
          <Input
            placeholder="e.g. Direct or agency name"
            value={form.agent}
            onChange={(e) => setForm({ ...form, agent: e.target.value })}
          />
        </FormGroup>

        <FormGroup label="Services">
          <div className="flex flex-wrap gap-3 mt-1">
            {SERVICE_OPTIONS.map((svc) => (
              <Checkbox
                key={svc}
                label={svc}
                checked={form.services.includes(svc)}
                onChange={() => toggleService(svc)}
              />
            ))}
          </div>
        </FormGroup>

        <FormRow>
          <FormGroup label="MRR ($)">
            <Input
              type="number"
              placeholder="e.g. 1200"
              value={form.mrr}
              onChange={(e) => setForm({ ...form, mrr: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="Stage">
            <Select
              value={form.stage}
              onChange={(e) =>
                setForm({ ...form, stage: e.target.value as Deal["stage"] })
              }
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormGroup>
        </FormRow>

        <FormGroup label="Expected Close">
          <Input
            type="date"
            value={form.close}
            onChange={(e) => setForm({ ...form, close: e.target.value })}
          />
        </FormGroup>
      </Modal>

      {/* delete confirm modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete the deal "${deleteTarget?.client}"? This cannot be undone.`}
        loading={deleting}
      />
    </>
  );
}
