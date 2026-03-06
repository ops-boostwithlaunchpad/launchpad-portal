"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card } from "@/components/DataTable";
import { StatusBadge, ServiceBadges } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select, Checkbox } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Agent, Agency, Deal, Client } from "@/lib/types";

const PER_PAGE = 10;

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencyList, setAgencyList] = useState<Agency[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Search, filters, pagination
  const [search, setSearch] = useState("");
  const [filterAgency, setFilterAgency] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  // Agent modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [agencyVal, setAgencyVal] = useState("");
  const [email, setEmail] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [commission, setCommission] = useState("");

  // Assign client modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignAgentId, setAssignAgentId] = useState<number | null>(null);
  const [assignClientName, setAssignClientName] = useState("");
  const [assignServices, setAssignServices] = useState<string[]>([]);
  const [assignMRR, setAssignMRR] = useState("");
  const [assignStage, setAssignStage] = useState("Won");

  function refreshData() {
    return Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/agencies").then((r) => r.json()),
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([agt, ag, d, c]) => {
      setAgents(Array.isArray(agt) ? agt : []);
      setAgencyList(Array.isArray(ag) ? ag : []);
      setDeals(Array.isArray(d) ? d : []);
      setClients(Array.isArray(c) ? c : []);
    });
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, []);

  // Enriched agent data
  const enriched = useMemo(() => {
    return agents.map((ag) => {
      const agentDeals = deals.filter((d) => d.agent === ag.name);
      const computedMRR = agentDeals.reduce((s, d) => s + d.mrr, 0);
      const commissionAmt = Math.round(computedMRR * (ag.commission / 100));
      const clientNames = [...new Set(agentDeals.map((d) => d.client))];
      const agentClients = clientNames
        .map((cn) => {
          const client = clients.find((c) => c.name === cn);
          if (!client) return null;
          const deal = agentDeals.find((d) => d.client === cn);
          return { ...client, dealServices: deal?.services || [], dealStage: deal?.stage || "" };
        })
        .filter(Boolean) as (Client & { dealServices: string[]; dealStage: string })[];

      return { ...ag, computedMRR, commissionAmt, dealCount: agentDeals.length, clients: agentClients };
    });
  }, [agents, deals, clients]);

  // Filter
  const filtered = useMemo(() => {
    let result = enriched;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.agency.toLowerCase().includes(q));
    }
    if (filterAgency) {
      result = result.filter((a) => a.agency === filterAgency);
    }
    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }
    return result;
  }, [enriched, search, filterAgency, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search, filterAgency, filterStatus]);

  const totalMRR = enriched.reduce((s, a) => s + a.computedMRR, 0);
  const avgCommission = agents.length > 0 ? Math.round(agents.reduce((s, a) => s + a.commission, 0) / agents.length) : 0;
  const activeCount = agents.filter((a) => a.status === "Active").length;

  // Unique agency names for filter (includes "Solo")
  const agencyNames = useMemo(() => [...new Set(agents.map((a) => a.agency))].sort(), [agents]);

  function toggleExpand(id: number) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Agent form handlers
  function resetForm() { setName(""); setAgencyVal(""); setEmail(""); setPasswordVal(""); setCommission(""); setEditTarget(null); }

  function openEdit(a: Agent) { setEditTarget(a); setName(a.name); setAgencyVal(a.agency); setEmail(a.email || ""); setPasswordVal(""); setCommission(String(a.commission)); setModalOpen(true); }

  async function handleSubmit() {
    if (!name.trim() || !agencyVal) return;
    if (editTarget) {
      const body: Record<string, unknown> = {
        id: editTarget.id, name: name.trim(), agency: agencyVal, email: email.trim(), closed: editTarget.closed, mrr: editTarget.mrr, commission: Number(commission) || 0, month: editTarget.month, status: editTarget.status,
      };
      if (passwordVal) body.password = passwordVal;
      const res = await fetch("/api/agents", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const updated = await res.json();
      setAgents(agents.map((a) => (a.id === editTarget.id ? updated : a)));
    } else {
      const res = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: name.trim(), agency: agencyVal, email: email.trim(), password: passwordVal, closed: 0, mrr: 0, commission: Number(commission) || 0, month: 0, status: "Active",
      }) });
      const created = await res.json();
      setAgents([...agents, created]);
    }
    resetForm(); setModalOpen(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/agents?id=${deleteTarget.id}`, { method: "DELETE" });
    setAgents(agents.filter((a) => a.id !== deleteTarget.id));
    setDeleting(false); setDeleteTarget(null);
  }

  // Assign client
  function openAssignClient(agentId: number) {
    setAssignAgentId(agentId); setAssignClientName(""); setAssignServices([]); setAssignMRR(""); setAssignStage("Won"); setAssignModal(true);
  }

  async function handleAssignClient() {
    if (!assignAgentId || !assignClientName || assignServices.length === 0) return;
    const agent = agents.find((a) => a.id === assignAgentId);
    if (!agent) return;
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      client: assignClientName, industry: clients.find((c) => c.name === assignClientName)?.industry || "Other",
      agent: agent.name, services: assignServices, mrr: Number(assignMRR) || 0, stage: assignStage, close: new Date().toISOString().split("T")[0],
    }) });
    setAssignModal(false); refreshData();
  }

  function toggleSvc(s: string) { setAssignServices((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]); }

  const headers = ["", "Agent", "Agency", "Deals", "MRR", "Commission %", "Commission $", "Status", "Actions"];

  if (loading) return <><Topbar title="Sales — Agents" /><PageLoader /></>;

  return (
    <>
      <Topbar title="Sales — Agents">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agents..." />
        <Select value={filterAgency} onChange={(e) => setFilterAgency(e.target.value)} className="!w-[140px]">
          <option value="">All Agencies</option>
          {agencyNames.map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="!w-[120px]">
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Onboarding">Onboarding</option>
          <option value="Inactive">Inactive</option>
        </Select>
        <Button onClick={() => setModalOpen(true)}>+ Add Agent</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(agents.length)} label="Total Agents" />
          <StatCard value={`$${totalMRR.toLocaleString()}`} label="Total MRR" valueColor="green" />
          <StatCard value={`${avgCommission}%`} label="Avg Commission" />
          <StatCard value={String(activeCount)} label="Active Agents" />
        </StatsRow>

        <Card title="All Agents">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-gray-200 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {paginated.map((ag) => {
                  const isExp = expanded.has(ag.id);
                  return (
                    <Fragment key={ag.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(ag.id)}>
                        <td className="px-3 py-2.5 w-8"><span className={isExp ? "text-indigo-600" : "text-gray-500"}>{isExp ? "▼" : "▶"}</span></td>
                        <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Avatar name={ag.name} /><span className="font-medium text-gray-800">{ag.name}</span></div></td>
                        <td className="px-3 py-2.5 text-gray-500">{ag.agency}</td>
                        <td className="px-3 py-2.5 text-gray-700">{ag.dealCount}</td>
                        <td className="px-3 py-2.5 text-emerald-600 font-mono font-semibold">${ag.computedMRR.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-700">{ag.commission}%</td>
                        <td className="px-3 py-2.5 text-amber-600 font-mono font-semibold">${ag.commissionAmt.toLocaleString()}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={ag.status} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openAssignClient(ag.id)} className="text-gray-400 hover:text-emerald-600 transition-colors p-1 text-[12px]" title="Assign Client">Assign</button>
                            <button onClick={() => openEdit(ag)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1 text-[12px]">Edit</button>
                            <button onClick={() => setDeleteTarget(ag)} className="text-gray-500 hover:text-red-600 transition-colors p-1 text-[12px]">Delete</button>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr><td colSpan={9} className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                          {ag.clients.length === 0 ? <div className="text-gray-500 text-xs py-2">No clients assigned to this agent.</div> : (
                            <div className="space-y-3">
                              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Clients handled by {ag.name}</div>
                              <table className="w-full text-[11.5px]">
                                <thead><tr>{["Client", "Industry", "Services", "Stage", "MRR", "Status"].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[9px] text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">{h}</th>)}</tr></thead>
                                <tbody>
                                  {ag.clients.map((c) => (
                                    <tr key={c.id} className="border-b border-gray-100">
                                      <td className="px-2 py-2"><div className="flex items-center gap-2"><Avatar name={c.name} /><span className="font-medium text-gray-800">{c.name}</span></div></td>
                                      <td className="px-2 py-2 text-gray-500">{c.industry}</td>
                                      <td className="px-2 py-2"><ServiceBadges services={c.dealServices} /></td>
                                      <td className="px-2 py-2">
                                        {c.dealStage && <span className={`text-[9px] px-1.5 py-0.5 rounded border ${c.dealStage === "Won" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : c.dealStage === "Lost" ? "bg-red-50 text-red-600 border-red-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"}`}>{c.dealStage}</span>}
                                      </td>
                                      <td className="px-2 py-2 text-emerald-600 font-mono font-semibold">${c.mrr.toLocaleString()}</td>
                                      <td className="px-2 py-2"><StatusBadge status={c.status} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
                {paginated.length === 0 && <tr><td colSpan={9} className="text-center text-gray-500 py-8 text-xs">{search || filterAgency || filterStatus ? "No agents match your filters." : "No agents yet."}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
              <div className="text-[11px] text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-50 text-gray-500 disabled:opacity-30">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-[11px] font-medium ${p === page ? "bg-indigo-500 text-white" : "text-gray-500 hover:bg-gray-50"}`}>{p}</button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-50 text-gray-500 disabled:opacity-30">›</button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Agent */}
      <Modal open={modalOpen} onClose={() => { resetForm(); setModalOpen(false); }} title={editTarget ? "Edit Agent" : "Add Agent"}
        actions={<><Button variant="ghost" onClick={() => { resetForm(); setModalOpen(false); }}>Cancel</Button><Button onClick={handleSubmit}>{editTarget ? "Save Changes" : "Add Agent"}</Button></>}>
        <FormRow>
          <FormGroup label="Agent Name"><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></FormGroup>
          <FormGroup label="Agency">
            <Select value={agencyVal} onChange={(e) => setAgencyVal(e.target.value)}>
              <option value="">Select agency...</option>
              <option value="Solo">Solo (No Agency)</option>
              {agencyList.map((ag) => <option key={ag.id} value={ag.agency}>{ag.agency}</option>)}
            </Select>
          </FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Email"><Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></FormGroup>
          <FormGroup label={editTarget ? "Password (leave blank to keep)" : "Password"}><Input type="password" placeholder={editTarget ? "••••••" : "Login password"} value={passwordVal} onChange={(e) => setPasswordVal(e.target.value)} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Commission %"><Input type="number" placeholder="e.g. 10" value={commission} onChange={(e) => setCommission(e.target.value)} /></FormGroup>
        </FormRow>
      </Modal>

      {/* Assign Client */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Client"
        actions={<><Button variant="ghost" onClick={() => setAssignModal(false)}>Cancel</Button><Button onClick={handleAssignClient}>Assign Client</Button></>}>
        <FormGroup label="Client">
          <Select value={assignClientName} onChange={(e) => { setAssignClientName(e.target.value); setAssignServices([]); }}>
            <option value="">Select client...</option>
            {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Services">
          <div className="flex flex-wrap gap-2 mt-1">
            {assignClientName
              ? (clients.find((c) => c.name === assignClientName)?.services || []).map((svc) => <Checkbox key={svc} label={svc} checked={assignServices.includes(svc)} onChange={() => toggleSvc(svc)} />)
              : <span className="text-gray-500 text-xs">Select a client first</span>}
          </div>
        </FormGroup>
        <FormRow>
          <FormGroup label="MRR ($)"><Input type="number" placeholder="e.g. 2000" value={assignMRR} onChange={(e) => setAssignMRR(e.target.value)} /></FormGroup>
          <FormGroup label="Stage">
            <Select value={assignStage} onChange={(e) => setAssignStage(e.target.value)}>
              {["Prospect", "Proposal", "Negotiation", "Won", "Lost"].map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormGroup>
        </FormRow>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete agent "${deleteTarget?.name ?? ""}"? This action cannot be undone.`} loading={deleting} />
    </>
  );
}
