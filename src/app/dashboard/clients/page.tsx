"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { Topbar, Tabs, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, ViewToggle } from "@/components/DataTable";
import {
  StatusBadge,
  ServiceBadge,
  ServiceBadges,
} from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { PageLoader } from "@/components/Loader";
import { ConfirmModal } from "@/components/ConfirmModal";
import {
  FormGroup,
  FormRow,
  Input,
  Select,
  Textarea,
  Checkbox,
} from "@/components/FormGroup";
import {
  Client,
  Task,
  SERVICE_OPTIONS,
  SVC_DESC,
  INDUSTRIES,
  SERVICE_TO_DEPT,
} from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { Pencil, Trash2, Check, Paperclip, X, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

const TABS = ["Client Roster", "Services Purchased", "Send to Backend"];


export default function ClientsPage() {
  const { user } = useAuth();
  const canEdit = user ? ["admin", "subadmin", "sales"].includes(user.role) : false;
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit client state
  const [editTarget, setEditTarget] = useState<Client | null>(null);

  // Add client form state
  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formServices, setFormServices] = useState<string[]>([]);
  const [formMrr, setFormMrr] = useState("");
  const [formRep, setFormRep] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPainPoints, setFormPainPoints] = useState("");
  const [formSetupFee, setFormSetupFee] = useState("");
  const [formStripe, setFormStripe] = useState(false);
  const [formOnboarding, setFormOnboarding] = useState(false);
  const [formAgreement, setFormAgreement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState("");

  // Onboarded / Pending sub-tab
  const [rosterTab, setRosterTab] = useState<"Onboarded" | "Pending">("Onboarded");

  // Search, filter & pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterService, setFilterService] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Expandable rows
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [desktopView, setDesktopView] = useState<"table" | "cards">("cards");

  function toggleExpand(id: number) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function getClientTasks(clientName: string) {
    return tasksList.filter((t) => t.client === clientName);
  }

  // Employees list for team assignment
  const [employees, setEmployees] = useState<{ id: number; name: string; department: string[] }[]>([]);

  // Send to backend form state
  const [sendClientId, setSendClientId] = useState("");
  const [sendService, setSendService] = useState("");
  const [sendTeam, setSendTeam] = useState("");
  const [sendPriority, setSendPriority] = useState("Normal");
  const [sendDue, setSendDue] = useState("");
  const [sendNotes, setSendNotes] = useState("");
  const [sendFile, setSendFile] = useState<File | null>(null);
  const [sendSaving, setSendSaving] = useState(false);
  const [sendAttempted, setSendAttempted] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  /* ---------- fetch data ---------- */

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()).catch(() => []),
    ])
      .then(([c, t, e]) => {
        setClientsList(Array.isArray(c) ? c : []);
        setTasksList(Array.isArray(t) ? t : []);
        setEmployees(Array.isArray(e) ? e : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---------- helpers ---------- */

  const activeClients = clientsList.filter((c) => c.status === "Active");
  const totalMrr = clientsList.reduce((sum, c) => sum + c.mrr, 0);

  // Get onboarding checklist values directly from client (fetched from Supabase)
  function getChecklist(c: Client) {
    return {
      stripe: c.stripePaymentDone,
      onboarding: c.onboardingFormFilled,
      agreement: c.agreementSigned,
    };
  }

  function isFullyOnboarded(c: Client) {
    return c.stripePaymentDone && c.onboardingFormFilled && c.agreementSigned;
  }

  const filteredClients = useMemo(() => {
    let list = clientsList;
    // Filter by onboarded/pending using Supabase clients table values
    if (rosterTab === "Onboarded") {
      list = list.filter((c) => isFullyOnboarded(c));
    } else {
      list = list.filter((c) => !isFullyOnboarded(c));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q)
      );
    }
    if (filterStatus) list = list.filter((c) => c.status === filterStatus);
    if (filterService) list = list.filter((c) => c.services.includes(filterService));
    return list;
  }, [clientsList, search, filterStatus, filterService, rosterTab]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PER_PAGE));
  const paginatedClients = filteredClients.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterService]);

  // Selected client's services for Send to Backend
  const selectedClient = clientsList.find((c) => c.id === Number(sendClientId));
  const selectedClientServices = selectedClient?.services || [];

  // Services that already have tasks with an employee assigned for the selected client
  const assignedServicesForClient = useMemo(() => {
    if (!selectedClient) return new Set<string>();
    return new Set(
      tasksList.filter((t) => (t.clientId === selectedClient.id || t.client === selectedClient.name) && t.assignedTo).map((t) => t.service)
    );
  }, [selectedClient, tasksList]);

  // Unassigned task counts per client (services without an employee-assigned task)
  const unassignedCountMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const c of clientsList) {
      const assignedSvcs = new Set(
        tasksList.filter((t) => t.client === c.name && t.assignedTo).map((t) => t.service)
      );
      map[c.id] = (c.services || []).filter((s) => !assignedSvcs.has(s)).length;
    }
    return map;
  }, [clientsList, tasksList]);

  // Reset service when client changes and selected service is no longer valid
  useEffect(() => {
    if (sendService && selectedClientServices.length > 0 && !selectedClientServices.includes(sendService)) {
      setSendService("");
    }
  }, [sendClientId]);

  function toggleService(svc: string) {
    setFormServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    );
  }

  function resetAddForm() {
    setFormName("");
    setFormIndustry("");
    setFormContact("");
    setFormEmail("");
    setFormServices([]);
    setFormMrr("");
    setFormRep("");
    setFormWebsite("");
    setFormCompanyName("");
    setFormLocation("");
    setFormPainPoints("");
    setFormSetupFee("");
    setFormStripe(false);
    setFormOnboarding(false);
    setFormAgreement(false);
    setEditTarget(null);
    setAttempted(false);
    setFormError("");
  }

  function openEdit(c: Client) {
    setEditTarget(c);
    setFormName(c.name);
    setFormIndustry(c.industry);
    setFormContact(c.contact);
    setFormEmail(c.email);
    setFormServices([...c.services]);
    setFormMrr(String(c.mrr));
    setFormRep(c.rep);
    setFormWebsite(c.website);
    setFormStripe(c.stripePaymentDone);
    setFormOnboarding(c.onboardingFormFilled);
    setFormAgreement(c.agreementSigned);
    setModalOpen(true);
  }

  async function handleSubmitClient() {
    setAttempted(true);
    setFormError("");
    if (!formName || !formEmail || !formIndustry || !formMrr) return;
    if (!editTarget && formServices.length === 0) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated: Client = {
          id: editTarget.id,
          name: formName,
          industry: formIndustry || "Other",
          contact: formContact,
          email: formEmail,
          services: formServices,
          mrr: Number(formMrr) || 0,
          start: editTarget.start,
          rep: formRep || "Launchpad",
          website: formWebsite,
          status: editTarget.status,
          stripePaymentDone: formStripe,
          onboardingFormFilled: formOnboarding,
          agreementSigned: formAgreement,
          sentToBackend: editTarget.sentToBackend,
        };
        try {
          const r = await fetch("/api/clients", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          });
          const saved = await r.json();
          setClientsList((prev) =>
            prev.map((c) => (c.id === editTarget.id ? saved : c))
          );
        } catch {
          setClientsList((prev) =>
            prev.map((c) => (c.id === editTarget.id ? updated : c))
          );
        }
      } else {
        // Adding new client directly — mark as fully onboarded
        const newClient = {
          name: formName,
          industry: formIndustry || "Other",
          contact: formContact,
          email: formEmail,
          services: formServices,
          mrr: Number(formMrr) || 0,
          rep: formRep || "Launchpad",
          website: formWebsite,
          companyName: formCompanyName,
          location: formLocation,
          painPoints: formPainPoints,
          setupFee: formSetupFee ? Number(formSetupFee) : 0,
          status: "Active",
          stripePaymentDone: true,
          onboardingFormFilled: true,
          agreementSigned: true,
        };
        try {
          const r = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newClient),
          });
          const saved = await r.json();
          if (r.ok) {
            setClientsList((prev) => [...prev, { ...newClient, ...saved, services: saved.services || formServices, sentToBackend: false }]);
          } else {
            setFormError(saved.error || "Failed to add client");
            setSaving(false);
            return;
          }
        } catch (err) {
          setFormError(err instanceof Error ? err.message : "Network error");
          setSaving(false);
          return;
        }
      }

      setModalOpen(false);
      resetAddForm();
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClient() {
    if (!deleteTarget) return;
    setDeleting(true);
    fetch(`/api/clients?id=${deleteTarget.id}`, { method: "DELETE" })
      .then(() => {
        setClientsList((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        setDeleting(false);
      })
      .catch(() => {
        setDeleteTarget(null);
        setDeleting(false);
      });
  }

  async function handleSendToBackend() {
    setSendAttempted(true);
    if (!sendClientId || !sendService || !sendTeam) return;
    const client = clientsList.find((c) => c.id === Number(sendClientId));
    if (!client) return;
    setSendSaving(true);

    // Upload file if selected
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (sendFile) {
      try {
        const formData = new FormData();
        formData.append("file", sendFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.fileUrl) {
          fileUrl = uploadData.fileUrl;
          fileName = uploadData.fileName;
        }
      } catch { /* file upload failed, continue without file */ }
    }

    const emp = employees.find((e) => e.name === sendTeam);

    // Check if an unassigned task already exists for this client + service
    const existingTask = tasksList.find(
      (t) => (t.clientId === client.id || t.client === client.name) && t.service === sendService && !t.assignedTo
    );

    if (existingTask) {
      // Update the existing unassigned task with employee assignment
      try {
        const r = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existingTask.id,
            assignedTo: emp?.id || null,
            assignedToName: emp?.name || null,
            priority: sendPriority,
            ...(sendDue ? { due: sendDue } : {}),
            ...(sendNotes ? { log: sendNotes } : {}),
            ...(fileUrl ? { fileUrl, fileName } : {}),
          }),
        });
        const saved = await r.json();
        setTasksList((prev) => prev.map((t) => (t.id === existingTask.id ? saved : t)));
        setSendSuccess(`${sendService} task for ${client.name} assigned to ${emp?.name || sendTeam}`);
        setTimeout(() => setSendSuccess(null), 5000);
      } catch { /* failed */ }
    } else {
      // Create a new task
      const newTask: Task = {
        id: Math.max(0, ...tasksList.map((t) => t.id)) + 1,
        client: client.name,
        clientId: client.id,
        service: sendService,
        team: (emp?.department && emp.department.length > 0 ? emp.department[0] : sendTeam),
        priority: sendPriority as Task["priority"],
        due: sendDue,
        notes: sendNotes,
        status: "Queued",
        progress: 0,
        logs: [],
        assignedTo: emp?.id || null,
        assignedToName: emp?.name || null,
        fileUrl,
        fileName,
      };
      try {
        const r = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTask),
        });
        const saved = await r.json();
        setTasksList((prev) => [...prev, saved]);
        setSendSuccess(`${sendService} task for ${client.name} assigned to ${emp?.name || sendTeam}`);
        setTimeout(() => setSendSuccess(null), 5000);
      } catch {
        setTasksList((prev) => [...prev, newTask]);
      }
    }
    setSendClientId("");
    setSendService("");
    setSendTeam("");
    setSendPriority("Normal");
    setSendDue("");
    setSendNotes("");
    setSendFile(null);
    setSendAttempted(false);
    setSendSaving(false);
  }

  /* ---------- task status badge ---------- */
  const TASK_STATUS_COLORS: Record<string, string> = {
    Queued: "bg-gray-100 text-gray-600 border-gray-200",
    "In Progress": "bg-blue-50 text-blue-600 border-blue-200",
    Review: "bg-amber-50 text-amber-600 border-amber-200",
    Done: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };

  const rosterHeaders = [" ", "Client", "Industry", "Services", "MRR", "Since", "Rep", "Status", "Onboarding", "Actions"];

  /* ---------- render ---------- */

  if (loading) {
    return (
      <>
        <Topbar title="Clients & Services" />
        <PageLoader />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Clients & Services">
        {canEdit && <Button onClick={() => { resetAddForm(); setModalOpen(true); }}>+ Add Client</Button>}
      </Topbar>

      <div className="p-4 md:p-6">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        {/* =================== TAB 1: CLIENT ROSTER =================== */}
        {activeTab === "Client Roster" && (
          <>
            <StatsRow>
              <StatCard
                value={String(activeClients.length)}
                label="Active Clients"
                             />
              <StatCard
                value={`$${totalMrr.toLocaleString()}`}
                label="MRR"
                valueColor="green"
              />
              <StatCard value="5" label="Industries" />
              <StatCard value="97%" label="Satisfaction" />
            </StatsRow>

            {/* Onboarded / Pending sub-tabs */}
            <div className="flex items-center gap-1 mb-3">
              {(["Onboarded", "Pending"] as const).map((tab) => {
                const count = tab === "Onboarded"
                  ? clientsList.filter((c) => isFullyOnboarded(c)).length
                  : clientsList.filter((c) => !isFullyOnboarded(c)).length;
                return (
                  <button
                    key={tab}
                    onClick={() => { setRosterTab(tab); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                      rosterTab === tab
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                        : "text-gray-500 hover:bg-gray-100 border border-transparent"
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>

            <Card title={rosterTab === "Onboarded" ? "Onboarded Clients" : "Pending Clients"} actions={null}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Churned">Churned</option>
                </select>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] text-gray-700 outline-none focus:border-indigo-500"
                >
                  <option value="">All Services</option>
                  {SERVICE_OPTIONS.map((svc) => (
                    <option key={svc} value={svc}>{svc}</option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500 ml-auto">
                  {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""}
                </span>
              </div>
              {/* View toggle */}
              <div className="hidden md:flex justify-end mb-2">
                <ViewToggle view={desktopView} onToggle={setDesktopView} />
              </div>

              {/* Mobile & Desktop card view */}
              <div className={desktopView === "table" ? "md:hidden space-y-2.5" : "space-y-2.5"}>
                {paginatedClients.length === 0 && <p className="text-center text-gray-400 py-8 text-xs">No clients found.</p>}
                {paginatedClients.map((c) => {
                  const isExp = expanded.has(c.id);
                  const tasks = getClientTasks(c.name);
                  return (
                    <div key={c.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                      <div className="p-3 cursor-pointer" onClick={() => toggleExpand(c.id)}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isExp ? <ChevronDown size={14} className="text-indigo-600 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                            <Avatar name={c.name} />
                            <div>
                              <div className="font-medium text-[12.5px] text-gray-800 flex items-center gap-1.5">
                                {c.name}
                                {rosterTab === "Pending" && (
                                  isFullyOnboarded(c)
                                    ? <span title="Fully onboarded"><CheckCircle2 size={14} className="text-emerald-500" /></span>
                                    : <span title="Onboarding incomplete"><AlertCircle size={14} className="text-orange-400" /></span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">{c.website}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {tasks.length > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 font-medium">
                                {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            <StatusBadge status={c.status} />
                          </div>
                        </div>
                        <div className="text-[11px] text-gray-500 mb-1.5 ml-6">{c.industry}</div>
                        <div className="flex items-center justify-between mb-2 ml-6">
                          <span className="text-[11px] text-gray-500">{c.rep}</span>
                          <span className="text-emerald-600 font-mono text-[12px] font-medium">${c.mrr.toLocaleString()}/mo</span>
                        </div>
                        <div className="flex items-center justify-between ml-6">
                          <ServiceBadges services={c.services} />
                          {canEdit && <div className="flex items-center gap-0.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                            <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>
                          </div>}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2 ml-6">
                          {(() => { const cl = getChecklist(c); return [
                            { label: "Stripe", done: cl.stripe },
                            { label: "Onboarding", done: cl.onboarding },
                            { label: "Agreement", done: cl.agreement },
                          ]; })().map((ch) => (
                            <div key={ch.label} className={`flex items-center gap-1 text-[10px] ${ch.done ? "text-emerald-600" : "text-gray-400"}`}>
                              <div className={`w-3 h-3 rounded border flex items-center justify-center ${ch.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                                {ch.done && <Check size={8} className="text-white" />}
                              </div>
                              {ch.label}
                            </div>
                          ))}
                        </div>
                      </div>
                      {isExp && (
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                          {tasks.length === 0 ? (
                            <p className="text-gray-400 text-[11px]">No backend tasks assigned yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Backend Tasks</div>
                              {tasks.map((t) => (
                                <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <ServiceBadge service={t.service} />
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${TASK_STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                      {t.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {t.assignedToName ? (
                                      <span className="font-medium text-gray-700">{t.assignedToName}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">Unassigned</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table view */}
              <div className={`overflow-x-auto ${desktopView === "cards" ? "hidden" : "hidden md:block"}`}>
                <table className="w-full border-collapse text-[12.5px]">
                  <thead>
                    <tr>{rosterHeaders.map((h, i) => <th key={i} className="text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-gray-200 font-semibold">{h.trim()}</th>)}</tr>
                  </thead>
                  <tbody>
                    {paginatedClients.map((c) => {
                      const isExp = expanded.has(c.id);
                      const tasks = getClientTasks(c.name);
                      return (
                        <Fragment key={c.id}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExpand(c.id)}>
                            <td className="px-3 py-2.5 w-8">
                              {isExp ? <ChevronDown size={14} className="text-indigo-600" /> : <ChevronRight size={14} className="text-gray-400" />}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <Avatar name={c.name} />
                                <div>
                                  <div className="font-medium text-gray-900 flex items-center gap-1.5">
                                    {c.name}
                                    {rosterTab === "Pending" && (
                                      isFullyOnboarded(c)
                                        ? <span title="Fully onboarded"><CheckCircle2 size={14} className="text-emerald-500" /></span>
                                        : <span title="Onboarding incomplete"><AlertCircle size={14} className="text-orange-400" /></span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-500">{c.website}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500">{c.industry}</td>
                            <td className="px-3 py-2.5"><ServiceBadges services={c.services} /></td>
                            <td className="px-3 py-2.5 text-emerald-600 font-mono">${c.mrr.toLocaleString()}</td>
                            <td className="px-3 py-2.5 font-mono text-gray-500">{c.start}</td>
                            <td className="px-3 py-2.5 text-gray-500">{c.rep}</td>
                            <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                            <td className="px-3 py-2.5">
                              <div className="space-y-1">
                                {(() => { const cl = getChecklist(c); return [
                                  { label: "Stripe", done: cl.stripe },
                                  { label: "Onboarding", done: cl.onboarding },
                                  { label: "Agreement", done: cl.agreement },
                                ]; })().map((ch) => (
                                  <div key={ch.label} className={`flex items-center gap-1.5 text-[11px] ${ch.done ? "text-emerald-600" : "text-gray-400"}`}>
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${ch.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"}`}>
                                      {ch.done && <Check size={10} className="text-white" />}
                                    </div>
                                    {ch.label}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                              {canEdit && (
                                <div className="flex items-center gap-0.5">
                                  <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                                  <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={10} className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                                {tasks.length === 0 ? (
                                  <p className="text-gray-400 text-[11px] py-1">No backend tasks assigned yet.</p>
                                ) : (
                                  <div>
                                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Backend Tasks</div>
                                    <table className="w-full text-[11.5px]">
                                      <thead>
                                        <tr>
                                          {["Service", "Status", "Assigned To", "Priority", "Due"].map((h) => (
                                            <th key={h} className="text-left px-2 py-1.5 text-[9px] text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-100">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {tasks.map((t) => (
                                          <tr key={t.id} className="border-b border-gray-100">
                                            <td className="px-2 py-2"><ServiceBadge service={t.service} /></td>
                                            <td className="px-2 py-2">
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${TASK_STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                                {t.status}
                                              </span>
                                            </td>
                                            <td className="px-2 py-2 text-gray-700">{t.assignedToName || <span className="text-gray-400 italic">Unassigned</span>}</td>
                                            <td className="px-2 py-2 text-gray-500">{t.priority}</td>
                                            <td className="px-2 py-2 text-gray-500 font-mono">{t.due || "—"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {paginatedClients.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-gray-400 py-8 text-xs">No clients found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
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
          </>
        )}

        {/* =================== TAB 2: SERVICES PURCHASED =================== */}
        {activeTab === "Services Purchased" && (
          <div className="space-y-4">
            {clientsList.map((client) => (
              <Card key={client.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {client.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {client.industry} &middot; {client.contact} &middot; $
                      {client.mrr.toLocaleString()}/mo
                    </p>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {client.services.map((svc) => (
                    <div
                      key={svc}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="mb-1.5">
                        <ServiceBadge service={svc} />
                      </div>
                      <p className="text-[10.5px] text-gray-500 leading-relaxed">
                        {SVC_DESC[svc] || ""}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* =================== TAB 3: SEND TO BACKEND =================== */}
        {activeTab === "Send to Backend" && (
          <div className="max-w-xl">
            {sendSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-3 text-[13px] text-emerald-700">
                <Check size={15} className="shrink-0" />
                <span>{sendSuccess}</span>
                <button onClick={() => setSendSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600 cursor-pointer"><X size={14} /></button>
              </div>
            )}
            <Card title="Create Backend Task">
              <FormGroup label="Client" required>
                <Select
                  value={sendClientId}
                  onChange={(e) => setSendClientId(e.target.value)}
                  error={sendAttempted && !sendClientId}
>
                  <option value="">Select client...</option>
                  {clientsList
                    .filter((c) => isFullyOnboarded(c))
                    .map((c) => {
                      const unassigned = unassignedCountMap[c.id] ?? 0;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name}{unassigned > 0 ? ` (${unassigned} unassigned)` : " (all assigned)"}
                        </option>
                      );
                    })}
                </Select>
              </FormGroup>

              <FormGroup label="Service / Task Type" required>
                <Select
                  value={sendService}
                  onChange={(e) => setSendService(e.target.value)}
                  error={sendAttempted && !sendService}
                >
                  <option value="">
                    {sendClientId ? "Select service..." : "Select a client first..."}
                  </option>
                  {selectedClientServices.map((svc) => {
                    const alreadyAssigned = assignedServicesForClient.has(svc);
                    return (
                      <option key={svc} value={svc} disabled={alreadyAssigned}>
                        {svc} — {alreadyAssigned ? "✓ Already assigned" : (SVC_DESC[svc] || "")}
                      </option>
                    );
                  })}
                </Select>
              </FormGroup>

              <FormGroup label="Assign To (Employee)" required>
                <Select
                  value={sendTeam}
                  onChange={(e) => setSendTeam(e.target.value)}
                  error={sendAttempted && !sendTeam}
                >
                  <option value="">{sendService ? "Select employee..." : "Select a service first..."}</option>
                  {(() => {
                    const matchDept = SERVICE_TO_DEPT[sendService] || "";
                    const matched = matchDept ? employees.filter((emp) => emp.department.includes(matchDept)) : [];
                    const others = matchDept ? employees.filter((emp) => !emp.department.includes(matchDept)) : employees;
                    return (
                      <>
                        {matched.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} — {emp.department.join(", ")}
                          </option>
                        ))}
                        {matched.length > 0 && others.length > 0 && (
                          <option disabled>── Other employees ──</option>
                        )}
                        {others.map((emp) => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name} — {emp.department.join(", ") || "No dept"}
                          </option>
                        ))}
                      </>
                    );
                  })()}
                </Select>
              </FormGroup>

              <FormRow>
                <FormGroup label="Priority">
                  <Select
                    value={sendPriority}
                    onChange={(e) => setSendPriority(e.target.value)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </Select>
                </FormGroup>
                <FormGroup label="Due Date">
                  <Input
                    type="date"
                    value={sendDue}
                    onChange={(e) => setSendDue(e.target.value)}
                  />
                </FormGroup>
              </FormRow>

              <FormGroup label="Brief">
                <Textarea
                  placeholder="Describe the task..."
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                />
              </FormGroup>

              <FormGroup label="Attachment (optional)">
                {sendFile ? (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <Paperclip size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[12px] text-gray-700 truncate flex-1">{sendFile.name}</span>
                    <button
                      onClick={() => setSendFile(null)}
                      className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 border-dashed rounded-lg px-3 py-2.5 cursor-pointer hover:border-indigo-400 transition-colors">
                      <Paperclip size={13} className="text-gray-400" />
                      <span className="text-[12px] text-gray-500">Click to attach a file</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setSendFile(f);
                        }}
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">Max 50MB. Allowed: PDF, PNG, JPG, GIF, WEBP, DOC, DOCX, XLS, XLSX, CSV, TXT, ZIP</p>
                  </div>
                )}
              </FormGroup>

              <Button
                className="w-full"
                onClick={handleSendToBackend}
                loading={sendSaving}
              >
                Send to Backend
              </Button>
            </Card>
          </div>
        )}
      </div>

      {/* =================== ADD / EDIT CLIENT MODAL =================== */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetAddForm();
        }}
        title={editTarget ? "Edit Client" : "Add New Client"}
        wide
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setModalOpen(false);
                resetAddForm();
              }}
            >
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSubmitClient}>
              {editTarget ? "Save Changes" : "Add Client"}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}
        {/* Client Info */}
        <FormRow>
          <FormGroup label="Client / Business Name" required>
            <Input
              placeholder="e.g. Acme Corp"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              error={attempted && !formName}
            />
          </FormGroup>
          <FormGroup label="Industry" required>
            <Select
              value={formIndustry}
              onChange={(e) => setFormIndustry(e.target.value)}
              error={attempted && !formIndustry}
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
              value={formContact}
              onChange={(e) => setFormContact(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Email" required>
            <Input
              type="email"
              placeholder="email@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              error={attempted && !formEmail}
            />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup label="Website">
            <Input
              placeholder="example.com"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Account Rep">
            <Input
              placeholder="Launchpad"
              value={formRep}
              onChange={(e) => setFormRep(e.target.value)}
            />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup label="Company Name">
            <Input
              placeholder="e.g. Acme Inc."
              value={formCompanyName}
              onChange={(e) => setFormCompanyName(e.target.value)}
            />
          </FormGroup>
          <FormGroup label="Location">
            <Input
              placeholder="e.g. Palm Beach Gardens, FL"
              value={formLocation}
              onChange={(e) => setFormLocation(e.target.value)}
            />
          </FormGroup>
        </FormRow>

        <FormRow>
          <FormGroup label="Pain Points">
            <Textarea
              placeholder="e.g. Low website traffic, no leads..."
              value={formPainPoints}
              onChange={(e) => setFormPainPoints(e.target.value)}
            />
          </FormGroup>
        </FormRow>

        {/* Services */}
        <FormGroup label="Services" required={!editTarget}>
          <div className="flex flex-wrap gap-3 mt-1">
            {SERVICE_OPTIONS.map((svc) => (
              <Checkbox
                key={svc}
                label={svc}
                checked={formServices.includes(svc)}
                onChange={() => toggleService(svc)}
              />
            ))}
          </div>
        </FormGroup>

        {/* Pricing */}
        <FormRow>
          <FormGroup label="Monthly Price ($)" required>
            <Input
              type="number"
              placeholder="e.g. 1200"
              value={formMrr}
              onChange={(e) => setFormMrr(e.target.value)}
              error={attempted && !formMrr}
            />
          </FormGroup>
          <FormGroup label="Setup Fee ($)">
            <Input
              type="number"
              placeholder="e.g. 500"
              value={formSetupFee}
              onChange={(e) => setFormSetupFee(e.target.value)}
            />
          </FormGroup>
        </FormRow>

      </Modal>

      {/* =================== DELETE CONFIRM MODAL =================== */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteClient}
        title="Delete Client"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
