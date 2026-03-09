"use client";

import { useState, useEffect } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import { Badge, StageBadge, ServiceBadges } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select, Checkbox, Textarea } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Deal, Agency, Agent, INDUSTRIES, SERVICE_OPTIONS } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

const STAGES: Deal["stage"][] = ["Prospect", "Proposal", "Negotiation", "Won", "Lost"];

const APPROVAL_COLORS: Record<string, string> = {
  Pending: "bg-yellow-50 text-yellow-600 border-yellow-200",
  Approved: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Rejected: "bg-red-50 text-red-600 border-red-200",
};

const emptyForm = {
  client: "",
  industry: "",
  agency: "",
  agent: "",
  services: [] as string[],
  mrr: "",
  stage: "Prospect" as Deal["stage"],
  close: "",
  contact: "",
  email: "",
  website: "",
  rep: "",
  stripePaymentDone: false,
  onboardingFormFilled: false,
  agreementSigned: false,
};

export default function SalesMasterPage() {
  const { user } = useAuth();
  const isAdmin = user ? ["admin", "subadmin"].includes(user.role) : false;
  const canEdit = user ? ["admin", "subadmin", "sales"].includes(user.role) : false;
  const isAgency = user?.role === "agency";
  const canCreate = canEdit || isAgency;
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Deal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Approve/Reject
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deal | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Agency agents list (for agency role)
  const [agencyAgents, setAgencyAgents] = useState<{ id: number; name: string }[]>([]);

  // Agencies & agents lists (for admin role)
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);

  // Filtered agents based on selected agency in the form
  const filteredAgents = form.agency
    ? allAgents.filter((a) => a.agency === form.agency)
    : allAgents;

  /* ---------- fetch deals ---------- */
  function refreshDeals() {
    fetch("/api/deals")
      .then((r) => r.json())
      .then((data) => setDeals(Array.isArray(data) ? data : []))
      .catch(() => {});
  }

  /* ---------- fetch deals on mount ---------- */
  useEffect(() => {
    const fetches: Promise<void>[] = [
      fetch("/api/deals")
        .then((r) => r.json())
        .then((data) => setDeals(Array.isArray(data) ? data : [])),
    ];

    if (isAgency) {
      fetches.push(
        fetch("/api/agents")
          .then((r) => r.json())
          .then((data) => setAgencyAgents(Array.isArray(data) ? data : []))
      );
    }

    if (canEdit) {
      fetches.push(
        fetch("/api/agencies")
          .then((r) => r.json())
          .then((data) => setAgencies(Array.isArray(data) ? data : []))
          .catch(() => {}),
        fetch("/api/agents")
          .then((r) => r.json())
          .then((data) => setAllAgents(Array.isArray(data) ? data : []))
          .catch(() => {})
      );
    }

    Promise.all(fetches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAgency, canEdit]);

  /* ---------- refetch deals on window focus ---------- */
  useEffect(() => {
    function onFocus() { refreshDeals(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  /* ---------- derived ---------- */
  const approvedDeals = deals.filter((d) => d.approval !== "Rejected");
  const confirmedMrr = approvedDeals
    .filter((d) => d.stage === "Won" && d.approval === "Approved")
    .reduce((sum, d) => sum + d.mrr, 0);
  const pendingCount = deals.filter((d) => d.approval === "Pending").length;

  const filtered = deals.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.client.toLowerCase().includes(q) ||
      d.industry.toLowerCase().includes(q) ||
      d.agent.toLowerCase().includes(q);
    const matchesStage = !stageFilter || d.stage === stageFilter;
    const matchesApproval = !approvalFilter || d.approval === approvalFilter;
    return matchesSearch && matchesStage && matchesApproval;
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
      agency: d.agency || "",
      agent: d.agent,
      services: [...d.services],
      mrr: String(d.mrr),
      stage: d.stage,
      close: d.close,
      contact: d.contact || "",
      email: d.email || "",
      website: d.website || "",
      rep: d.rep || "",
      stripePaymentDone: d.stripePaymentDone || false,
      onboardingFormFilled: d.onboardingFormFilled || false,
      agreementSigned: d.agreementSigned || false,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    setAttempted(true);
    if (!form.client || !form.industry || !form.mrr) return;
    if (isAgency && !form.agent) return;
    setSaving(true);
    try {
      const body = {
        ...(editTarget ? { id: editTarget.id } : {}),
        client: form.client,
        industry: form.industry,
        agency: form.agency,
        agent: form.agent || "Direct",
        services: form.services.length > 0 ? form.services : ["Local SEO"],
        mrr: Number(form.mrr),
        stage: form.stage,
        close: form.close || new Date().toISOString().slice(0, 10),
        contact: form.contact,
        email: form.email,
        website: form.website,
        rep: form.rep || "Launchpad",
        stripePaymentDone: form.stripePaymentDone,
        onboardingFormFilled: form.onboardingFormFilled,
        agreementSigned: form.agreementSigned,
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
      setAttempted(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/deals?id=${deleteTarget.id}`, { method: "DELETE" });
    setDeals((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
  }

  async function handleApprove(deal: Deal) {
    setApprovingId(deal.id);
    try {
      const res = await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deal.id, approval: "Approved" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      }
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const res = await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectTarget.id, approval: "Rejected", rejectionReason: rejectReason.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      }
      setRejectTarget(null);
      setRejectReason("");
    } finally {
      setRejecting(false);
    }
  }

  /* ---------- table columns ---------- */
  const columns = [
    {
      key: "client",
      header: "Client",
      render: (d: Deal) => (
        <div className="flex items-center gap-2">
          <Avatar name={d.client} size="sm" />
          <span className="font-medium text-gray-800">{d.client}</span>
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
        <span className="text-emerald-600 font-mono">
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
      key: "approval",
      header: "Approval",
      render: (d: Deal) => (
        <div className="flex flex-col gap-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border w-fit ${APPROVAL_COLORS[d.approval] || APPROVAL_COLORS.Approved}`}>
            {d.approval || "Approved"}
          </span>
          {d.approval === "Rejected" && d.rejectionReason && (
            <span className="text-[10px] text-red-500 leading-tight max-w-[140px] truncate" title={d.rejectionReason}>
              {d.rejectionReason}
            </span>
          )}
          {d.submittedBy && (
            <span className="text-[9px] text-gray-400">by {d.submittedBy}</span>
          )}
        </div>
      ),
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
      header: "",
      render: (d: Deal) => (
        <div className="flex items-center gap-0.5">
          {/* Approve/Reject buttons for admin on Pending deals */}
          {isAdmin && d.approval === "Pending" && (
            <>
              <button
                onClick={() => handleApprove(d)}
                disabled={approvingId === d.id}
                className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5 disabled:opacity-50"
                title="Approve"
              >
                {approvingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
              <button
                onClick={() => { setRejectTarget(d); setRejectReason(""); }}
                disabled={approvingId === d.id}
                className="text-gray-400 hover:text-red-600 transition-colors p-1.5 disabled:opacity-50"
                title="Reject"
              >
                <X size={14} />
              </button>
            </>
          )}
          {(canEdit || isAgency) && (
            <>
              <button
                onClick={() => openEdit(d)}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              {canEdit && (
                <button
                  onClick={() => setDeleteTarget(d)}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1.5"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}
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
          className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-800 outline-none focus:border-indigo-500"
        >
          <option value="">All Stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {isAdmin && (
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-800 outline-none focus:border-indigo-500"
          >
            <option value="">All Approvals</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        )}
        {canCreate && <Button onClick={() => setModalOpen(true)}>+ New Deal</Button>}
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
          />
          {isAdmin && (
            <StatCard
              value={String(pendingCount)}
              label="Pending Approval"
              valueColor={pendingCount > 0 ? "yellow" : undefined}
            />
          )}
          <StatCard
            value={String(deals.length)}
            label="Total Deals"
          />
          <StatCard
            value="68%"
            label="Close Rate"
            sub="↑ vs last quarter"
            trend="up"
          />
        </StatsRow>

        {/* table */}
        <Card title="All Deals">
          <DataTable
            columns={columns}
            data={filtered}
            mobileCard={(d, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={d.client} size="sm" />
                    <span className="font-medium text-[12.5px] text-gray-800">{d.client}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${APPROVAL_COLORS[d.approval] || APPROVAL_COLORS.Approved}`}>
                      {d.approval || "Approved"}
                    </span>
                    <StageBadge stage={d.stage} />
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 mb-1.5">{d.industry}</div>
                {d.approval === "Rejected" && d.rejectionReason && (
                  <div className="text-[11px] text-red-500 mb-1.5 bg-red-50 px-2 py-1 rounded border border-red-100">
                    Reason: {d.rejectionReason}
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500">{d.agent}</span>
                  <span className="text-emerald-600 font-mono text-[12px] font-medium">
                    ${d.mrr.toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <ServiceBadges services={d.services} />
                  <div className="flex items-center gap-0.5 shrink-0 ml-2">
                    {isAdmin && d.approval === "Pending" && (
                      <>
                        <button onClick={() => handleApprove(d)} disabled={approvingId === d.id} className="text-gray-400 hover:text-emerald-600 transition-colors p-1.5 disabled:opacity-50" title="Approve">{approvingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                        <button onClick={() => { setRejectTarget(d); setRejectReason(""); }} disabled={approvingId === d.id} className="text-gray-400 hover:text-red-600 transition-colors p-1.5 disabled:opacity-50" title="Reject"><X size={14} /></button>
                      </>
                    )}
                    {(canEdit || isAgency) && (
                      <>
                        <button onClick={() => openEdit(d)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                        {canEdit && <button onClick={() => setDeleteTarget(d)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          />
        </Card>
      </div>

      {/* Add/Edit Deal Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); setAttempted(false); }}
        title={editTarget ? "Edit Deal" : isAgency ? "Submit New Deal" : "Add New Deal"}
        actions={
          <>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditTarget(null); setForm(emptyForm); setAttempted(false); }}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSubmit}>{editTarget ? "Save Changes" : isAgency ? "Submit for Approval" : "Add Deal"}</Button>
          </>
        }
      >
        {isAgency && !editTarget && (
          <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-[12px]">
            This deal will be submitted for admin approval before it becomes active.
          </div>
        )}

        {/* Client Info */}
        <FormRow>
          <FormGroup label="Client / Business Name">
            <Input
              placeholder="e.g. Acme Corp"
              value={form.client}
              onChange={(e) => setForm({ ...form, client: e.target.value })}
              error={attempted && !form.client}
            />
          </FormGroup>
          <FormGroup label="Industry">
            <Select
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              error={attempted && !form.industry}
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

        <FormRow>
          <FormGroup label="Contact Name">
            <Input
              placeholder="Contact name"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="Email">
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup label="Website">
            <Input
              placeholder="example.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </FormGroup>
          <FormGroup label="Account Rep">
            <Input
              placeholder="Launchpad"
              value={form.rep}
              onChange={(e) => setForm({ ...form, rep: e.target.value })}
            />
          </FormGroup>
        </FormRow>

        {/* Agency / Agent */}
        {isAgency ? (
          <FormGroup label="Agent">
            <Select
              value={form.agent}
              onChange={(e) => setForm({ ...form, agent: e.target.value })}
              error={attempted && !form.agent}
            >
              <option value="">Select agent...</option>
              {agencyAgents.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </Select>
          </FormGroup>
        ) : (
          <FormRow>
            <FormGroup label="Agency">
              <Select
                value={form.agency}
                onChange={(e) => setForm({ ...form, agency: e.target.value, agent: "" })}
              >
                <option value="">Direct (no agency)</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.agency}>{a.agency}</option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup label="Agent">
              <Select
                value={form.agent}
                onChange={(e) => setForm({ ...form, agent: e.target.value })}
              >
                <option value="">{form.agency ? "Select agent..." : "Direct"}</option>
                {filteredAgents.map((a) => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </Select>
            </FormGroup>
          </FormRow>
        )}

        {/* Services */}
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

        {/* Deal Details */}
        <FormRow>
          <FormGroup label="MRR ($)">
            <Input
              type="number"
              placeholder="e.g. 1200"
              value={form.mrr}
              onChange={(e) => setForm({ ...form, mrr: e.target.value })}
              error={attempted && !form.mrr}
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

        {/* Onboarding Checklist */}
        <FormGroup label="Onboarding Checklist">
          <div className="flex flex-wrap gap-4 mt-1">
            <Checkbox
              label="Stripe Payment Done"
              checked={form.stripePaymentDone}
              onChange={() => setForm({ ...form, stripePaymentDone: !form.stripePaymentDone })}
            />
            <Checkbox
              label="Onboarding Form Filled"
              checked={form.onboardingFormFilled}
              onChange={() => setForm({ ...form, onboardingFormFilled: !form.onboardingFormFilled })}
            />
            <Checkbox
              label="Agreement Signed"
              checked={form.agreementSigned}
              onChange={() => setForm({ ...form, agreementSigned: !form.agreementSigned })}
            />
          </div>
        </FormGroup>
      </Modal>

      {/* Reject Deal Modal */}
      <Modal
        open={!!rejectTarget}
        onClose={() => { setRejectTarget(null); setRejectReason(""); }}
        title="Reject Deal"
        actions={
          <>
            <Button variant="ghost" onClick={() => { setRejectTarget(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="danger" loading={rejecting} onClick={handleReject}>
              Reject Deal
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 mb-3">
          Rejecting deal &quot;{rejectTarget?.client}&quot; submitted by {rejectTarget?.submittedBy || "unknown"}.
        </p>
        <FormGroup label="Reason for Rejection (optional)">
          <Textarea
            placeholder="e.g. MRR too low, client already exists..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </FormGroup>
      </Modal>

      {/* Delete confirm modal */}
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
