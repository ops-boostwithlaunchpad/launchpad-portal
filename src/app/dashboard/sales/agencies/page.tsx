"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Topbar, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card } from "@/components/DataTable";
import { StatusBadge, ServiceBadges } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormGroup, FormRow, Input, Select, Textarea, Checkbox } from "@/components/FormGroup";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Agency, Agent, Deal, Client } from "@/lib/types";
import {
  Building2,
  DollarSign,
  Users as UsersIcon,
  TrendingUp,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  UserPlus,
} from "lucide-react";

const PER_PAGE = 10;

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Search & pagination
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Agency modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Agency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agency | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [email, setEmail] = useState("");
  const [commission, setCommission] = useState("");
  const [notes, setNotes] = useState("");

  // Assign client modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignAgencyId, setAssignAgencyId] = useState<number | null>(null);
  const [assignAgentId, setAssignAgentId] = useState("");
  const [assignClientName, setAssignClientName] = useState("");
  const [assignServices, setAssignServices] = useState<string[]>([]);
  const [assignMRR, setAssignMRR] = useState("");
  const [assignStage, setAssignStage] = useState("Won");

  function refreshData() {
    return Promise.all([
      fetch("/api/agencies").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([ag, agt, d, c]) => {
      setAgencies(Array.isArray(ag) ? ag : []);
      setAgents(Array.isArray(agt) ? agt : []);
      setDeals(Array.isArray(d) ? d : []);
      setClients(Array.isArray(c) ? c : []);
    });
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, []);

  // Enriched agency data
  const enriched = useMemo(() => {
    return agencies.map((a) => {
      const agencyAgents = agents.filter((ag) => ag.agency === a.agency);
      const agentNames = new Set(agencyAgents.map((ag) => ag.name));
      const agencyDeals = deals.filter((d) => agentNames.has(d.agent));
      const totalMRR = agencyDeals.reduce((s, d) => s + d.mrr, 0);
      const clientNames = [...new Set(agencyDeals.map((d) => d.client))];
      const agencyClients = clientNames.map((cn) => clients.find((c) => c.name === cn)).filter(Boolean) as Client[];

      const agentBreakdown = agencyAgents.map((ag) => {
        const agentDeals = deals.filter((d) => d.agent === ag.name);
        const agentMRR = agentDeals.reduce((s, d) => s + d.mrr, 0);
        const agentClientNames = [...new Set(agentDeals.map((d) => d.client))];
        const agentClients = agentClientNames
          .map((cn) => {
            const cl = clients.find((c) => c.name === cn);
            if (!cl) return null;
            const deal = agentDeals.find((d) => d.client === cn);
            return { ...cl, dealServices: deal?.services || [], dealStage: deal?.stage || "" };
          })
          .filter(Boolean) as (Client & { dealServices: string[]; dealStage: string })[];
        return { ...ag, computedMRR: agentMRR, commissionAmt: Math.round(agentMRR * (ag.commission / 100)), dealCount: agentDeals.length, clients: agentClients };
      });

      return { ...a, agentList: agentBreakdown, totalMRR, clientCount: agencyClients.length, agentCount: agencyAgents.length };
    });
  }, [agencies, agents, deals, clients]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter((a) => a.agency.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }, [enriched, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search]);

  const grandMRR = enriched.reduce((s, a) => s + a.totalMRR, 0);
  const totalAgentCount = enriched.reduce((s, a) => s + a.agentCount, 0);
  const totalClientCount = enriched.reduce((s, a) => s + a.clientCount, 0);

  function toggleExpand(id: number) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function resetForm() { setName(""); setAgency(""); setEmail(""); setCommission(""); setNotes(""); setEditTarget(null); }

  function openEdit(a: Agency) { setEditTarget(a); setName(a.name); setAgency(a.agency); setCommission(String(a.commission)); setModalOpen(true); }

  async function handleSubmit() {
    if (!name.trim() || !agency.trim()) return;
    if (editTarget) {
      const res = await fetch("/api/agencies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editTarget.id, name: name.trim(), agency: agency.trim(), commission: Number(commission) || 0 }) });
      const updated = await res.json();
      setAgencies(agencies.map((a) => (a.id === editTarget.id ? updated : a)));
    } else {
      const res = await fetch("/api/agencies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), agency: agency.trim(), agents: 0, clients: 0, mrr: 0, commission: Number(commission) || 0, status: "Onboarding" }) });
      const created = await res.json();
      setAgencies([...agencies, created]);
    }
    resetForm(); setModalOpen(false);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/agencies?id=${deleteTarget.id}`, { method: "DELETE" });
    setAgencies(agencies.filter((a) => a.id !== deleteTarget.id));
    setDeleting(false); setDeleteTarget(null);
  }

  // Assign client
  function openAssignClient(agencyId: number) {
    setAssignAgencyId(agencyId); setAssignAgentId(""); setAssignClientName(""); setAssignServices([]); setAssignMRR(""); setAssignStage("Won"); setAssignModal(true);
  }

  const assignableAgents = useMemo(() => {
    if (!assignAgencyId) return [];
    const ag = agencies.find((a) => a.id === assignAgencyId);
    return ag ? agents.filter((a) => a.agency === ag.agency) : [];
  }, [assignAgencyId, agencies, agents]);

  async function handleAssignClient() {
    if (!assignAgentId || !assignClientName || assignServices.length === 0) return;
    const agent = agents.find((a) => String(a.id) === assignAgentId);
    if (!agent) return;
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      client: assignClientName, industry: clients.find((c) => c.name === assignClientName)?.industry || "Other",
      agent: agent.name, services: assignServices, mrr: Number(assignMRR) || 0, stage: assignStage, close: new Date().toISOString().split("T")[0],
    }) });
    setAssignModal(false); refreshData();
  }

  function toggleSvc(s: string) { setAssignServices((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]); }

  const headers = ["", "Agency", "Owner", "Agents", "Clients", "Total MRR", "Commission %", "Status", "Actions"];

  if (loading) return <><Topbar title="Sales — Agency Owners" /><PageLoader /></>;

  return (
    <>
      <Topbar title="Sales — Agency Owners">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agencies..." />
        <Button onClick={() => setModalOpen(true)}>+ Add Agency</Button>
      </Topbar>

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(agencies.length)} label="Agency Partners" icon={Building2} iconColor="blue" />
          <StatCard value={`$${grandMRR.toLocaleString()}`} label="Total Agency MRR" valueColor="green" icon={DollarSign} />
          <StatCard value={String(totalAgentCount)} label="Total Agents" icon={UsersIcon} iconColor="purple" />
          <StatCard value={String(totalClientCount)} label="Total Clients" icon={TrendingUp} iconColor="teal" />
        </StatsRow>

        <Card title="All Agencies">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead><tr>{headers.map((h) => <th key={h} className="text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-[#242433] font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {paginated.map((a) => {
                  const isExp = expanded.has(a.id);
                  return (
                    <Fragment key={a.id}>
                      <tr className="border-b border-[#242433]/60 hover:bg-[#1a1a26] transition-colors cursor-pointer" onClick={() => toggleExpand(a.id)}>
                        <td className="px-3 py-2.5 w-8">{isExp ? <ChevronDown size={14} className="text-indigo-400" /> : <ChevronRight size={14} className="text-gray-500" />}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-200">{a.agency}</td>
                        <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Avatar name={a.name} /><span className="text-gray-300">{a.name}</span></div></td>
                        <td className="px-3 py-2.5 text-gray-300">{a.agentCount}</td>
                        <td className="px-3 py-2.5 text-gray-300">{a.clientCount}</td>
                        <td className="px-3 py-2.5 text-emerald-400 font-mono font-semibold">${a.totalMRR.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-gray-300">{a.commission}%</td>
                        <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openAssignClient(a.id)} className="text-gray-600 hover:text-emerald-400 transition-colors p-1" title="Assign Client"><UserPlus size={14} /></button>
                            <button onClick={() => openEdit(a)} className="text-gray-600 hover:text-indigo-400 transition-colors p-1"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(a)} className="text-gray-500 hover:text-red-400 transition-colors p-1"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr><td colSpan={9} className="bg-[#0d0d14] px-6 py-4 border-b border-[#242433]/60">
                          {a.agentList.length === 0 ? <div className="text-gray-500 text-xs py-2">No agents under this agency yet.</div> : (
                            <div className="space-y-3">
                              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Agents under {a.agency}</div>
                              <table className="w-full text-[11.5px]">
                                <thead><tr>{["Agent", "Deals", "MRR", "Commission %", "Commission $", "Clients & Services"].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[9px] text-gray-500 uppercase tracking-wider font-semibold border-b border-[#242433]/40">{h}</th>)}</tr></thead>
                                <tbody>
                                  {a.agentList.map((ag) => (
                                    <tr key={ag.id} className="border-b border-[#242433]/30">
                                      <td className="px-2 py-2"><div className="flex items-center gap-2"><Avatar name={ag.name} /><span className="font-medium text-gray-200">{ag.name}</span></div></td>
                                      <td className="px-2 py-2 text-gray-300">{ag.dealCount}</td>
                                      <td className="px-2 py-2 text-emerald-400 font-mono font-semibold">${ag.computedMRR.toLocaleString()}</td>
                                      <td className="px-2 py-2 text-gray-300">{ag.commission}%</td>
                                      <td className="px-2 py-2 text-amber-400 font-mono font-semibold">${ag.commissionAmt.toLocaleString()}</td>
                                      <td className="px-2 py-2">
                                        {ag.clients.length === 0 ? <span className="text-gray-600 text-[10px]">None</span> : (
                                          <div className="space-y-1.5">
                                            {ag.clients.map((c) => (
                                              <div key={c.id} className="flex items-center gap-2 flex-wrap">
                                                <span className="text-gray-300 text-[10.5px] font-medium">{c.name}</span>
                                                <StatusBadge status={c.status} />
                                                <ServiceBadges services={c.dealServices} />
                                                {c.dealStage && <span className={`text-[9px] px-1.5 py-0.5 rounded border ${c.dealStage === "Won" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : c.dealStage === "Lost" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>{c.dealStage}</span>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
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
                {paginated.length === 0 && <tr><td colSpan={9} className="text-center text-gray-500 py-8 text-xs">{search ? "No agencies match your search." : "No agencies yet."}</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#242433]">
              <div className="text-[11px] text-gray-500">Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-[#1a1a26] text-gray-400 disabled:opacity-30"><ChevronLeft size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-[11px] font-medium ${p === page ? "bg-indigo-500 text-white" : "text-gray-400 hover:bg-[#1a1a26]"}`}>{p}</button>
                ))}
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-[#1a1a26] text-gray-400 disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Agency */}
      <Modal open={modalOpen} onClose={() => { resetForm(); setModalOpen(false); }} title={editTarget ? "Edit Agency" : "Add Agency"}
        actions={<><Button variant="ghost" onClick={() => { resetForm(); setModalOpen(false); }}>Cancel</Button><Button onClick={handleSubmit}>{editTarget ? "Save Changes" : "Add Agency"}</Button></>}>
        <FormRow>
          <FormGroup label="Owner Name"><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></FormGroup>
          <FormGroup label="Agency Name"><Input placeholder="Agency name" value={agency} onChange={(e) => setAgency(e.target.value)} /></FormGroup>
        </FormRow>
        <FormRow>
          <FormGroup label="Email"><Input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></FormGroup>
          <FormGroup label="Commission %"><Input type="number" placeholder="e.g. 12" value={commission} onChange={(e) => setCommission(e.target.value)} /></FormGroup>
        </FormRow>
        <FormGroup label="Notes"><Textarea placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></FormGroup>
      </Modal>

      {/* Assign Client */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Client to Agent"
        actions={<><Button variant="ghost" onClick={() => setAssignModal(false)}>Cancel</Button><Button onClick={handleAssignClient}>Assign Client</Button></>}>
        <FormRow>
          <FormGroup label="Agent">
            <Select value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)}>
              <option value="">Select agent...</option>
              {assignableAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Client">
            <Select value={assignClientName} onChange={(e) => { setAssignClientName(e.target.value); setAssignServices([]); }}>
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </FormGroup>
        </FormRow>
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
        message={`Are you sure you want to delete "${deleteTarget?.agency ?? ""}"? This action cannot be undone.`} loading={deleting} />
    </>
  );
}
