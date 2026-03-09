"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar, Tabs, SearchInput } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
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
} from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { Pencil, Trash2, Check, Paperclip, X } from "lucide-react";

const TABS = ["Client Roster", "Services Purchased", "Send to Backend"];

const INDUSTRIES = [
  "Personal Injury Law",
  "Criminal Defense Law",
  "Healthcare / Medical",
  "Dental",
  "Construction",
  "Home Services",
  "Other",
];

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
  const [formStripe, setFormStripe] = useState(false);
  const [formOnboarding, setFormOnboarding] = useState(false);
  const [formAgreement, setFormAgreement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Search, filter & pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterService, setFilterService] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Employees list for team assignment
  const [employees, setEmployees] = useState<{ id: number; name: string; department: string | null }[]>([]);

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

  const filteredClients = useMemo(() => {
    let list = clientsList;
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
  }, [clientsList, search, filterStatus, filterService]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PER_PAGE));
  const paginatedClients = filteredClients.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus, filterService]);

  // Selected client's services for Send to Backend
  const selectedClient = clientsList.find((c) => c.id === Number(sendClientId));
  const selectedClientServices = selectedClient?.services || [];

  // Services that already have tasks assigned for the selected client
  const assignedServicesForClient = useMemo(() => {
    if (!selectedClient) return new Set<string>();
    return new Set(
      tasksList.filter((t) => t.client === selectedClient.name).map((t) => t.service)
    );
  }, [selectedClient, tasksList]);

  // Unassigned task counts per client (services without a backend task)
  const unassignedCountMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const c of clientsList) {
      const clientTasks = tasksList.filter((t) => t.client === c.name);
      const assignedSvcs = new Set(clientTasks.map((t) => t.service));
      map[c.id] = c.services.filter((s) => !assignedSvcs.has(s)).length;
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
    setFormStripe(false);
    setFormOnboarding(false);
    setFormAgreement(false);
    setEditTarget(null);
    setAttempted(false);
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
    if (!formName) return;
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
        const newClient: Client = {
          id: Math.max(0, ...clientsList.map((c) => c.id)) + 1,
          name: formName,
          industry: formIndustry || "Other",
          contact: formContact,
          email: formEmail,
          services: formServices,
          mrr: Number(formMrr) || 0,
          start: new Date().toISOString().slice(0, 10),
          rep: formRep || "Launchpad",
          website: formWebsite,
          status: "Active",
          stripePaymentDone: formStripe,
          onboardingFormFilled: formOnboarding,
          agreementSigned: formAgreement,
          sentToBackend: false,
        };
        try {
          const r = await fetch("/api/clients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newClient),
          });
          const saved = await r.json();
          setClientsList((prev) => [...prev, saved]);
        } catch {
          setClientsList((prev) => [...prev, newClient]);
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
    const newTask: Task = {
      id: Math.max(0, ...tasksList.map((t) => t.id)) + 1,
      client: client.name,
      service: sendService,
      team: emp?.department || sendTeam,
      priority: sendPriority as Task["priority"],
      due: sendDue,
      notes: sendNotes,
      status: "Queued",
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

  /* ---------- columns for Client Roster table ---------- */

  const clientColumns = [
    {
      key: "client",
      header: "Client",
      render: (c: Client) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={c.name} />
          <div>
            <div className="font-medium text-gray-900">{c.name}</div>
            <div className="text-[10px] text-gray-500">{c.website}</div>
          </div>
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (c: Client) => (
        <span className="text-gray-500">{c.industry}</span>
      ),
    },
    {
      key: "services",
      header: "Services",
      render: (c: Client) => <ServiceBadges services={c.services} />,
    },
    {
      key: "mrr",
      header: "MRR",
      render: (c: Client) => (
        <span className="text-emerald-600 font-mono">
          ${c.mrr.toLocaleString()}
        </span>
      ),
    },
    {
      key: "since",
      header: "Since",
      render: (c: Client) => (
        <span className="font-mono text-gray-500">{c.start}</span>
      ),
    },
    {
      key: "rep",
      header: "Rep",
      render: (c: Client) => (
        <span className="text-gray-500">{c.rep}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: Client) => <StatusBadge status={c.status} />,
    },
    {
      key: "onboarding",
      header: "Onboarding",
      render: (c: Client) => {
        const checks = [
          { label: "Stripe", done: c.stripePaymentDone },
          { label: "Onboarding", done: c.onboardingFormFilled },
          { label: "Agreement", done: c.agreementSigned },
        ];
        return (
          <div className="space-y-1">
            {checks.map((ch) => (
              <div
                key={ch.label}
                className={`flex items-center gap-1.5 text-[11px] ${ch.done ? "text-emerald-600" : "text-gray-400"}`}
              >
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  ch.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                }`}>
                  {ch.done && <Check size={10} className="text-white" />}
                </div>
                {ch.label}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      render: (c: Client) => canEdit ? (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => openEdit(c)}
            className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 cursor-pointer"
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="text-gray-400 hover:text-red-600 transition-colors p-1.5 cursor-pointer"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : null,
    },
  ];

  /* ---------- render ---------- */

  if (loading) {
    return (
      <>
        <Topbar title="Clients & Services">
          {/* Clients are created through deals — edit via pencil icon */}
        </Topbar>
        <PageLoader />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Clients & Services">
        {/* Clients are created through deals — edit via pencil icon */}
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

            <Card title="Client Roster" actions={null}>
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
              <DataTable
                columns={clientColumns}
                data={paginatedClients}
                mobileCard={(c, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} />
                        <div>
                          <div className="font-medium text-[12.5px] text-gray-800">{c.name}</div>
                          <div className="text-[10px] text-gray-500">{c.website}</div>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-[11px] text-gray-500 mb-1.5">{c.industry}</div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-gray-500">{c.rep}</span>
                      <span className="text-emerald-600 font-mono text-[12px] font-medium">${c.mrr.toLocaleString()}/mo</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <ServiceBadges services={c.services} />
                      {canEdit && <div className="flex items-center gap-0.5 shrink-0 ml-2">
                        <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5" title="Edit"><Pencil size={13} /></button>
                        <button onClick={() => setDeleteTarget(c)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5" title="Delete"><Trash2 size={13} /></button>
                      </div>}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                      {[
                        { label: "Stripe", done: c.stripePaymentDone },
                        { label: "Onboarding", done: c.onboardingFormFilled },
                        { label: "Agreement", done: c.agreementSigned },
                      ].map((ch) => (
                        <div
                          key={ch.label}
                          className={`flex items-center gap-1 text-[10px] ${ch.done ? "text-emerald-600" : "text-gray-400"}`}
                        >
                          <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                            ch.done ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                          }`}>
                            {ch.done && <Check size={8} className="text-white" />}
                          </div>
                          {ch.label}
                        </div>
                      ))}
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
              <FormGroup label="Client">
                <Select
                  value={sendClientId}
                  onChange={(e) => setSendClientId(e.target.value)}
                  error={sendAttempted && !sendClientId}
                >
                  <option value="">Select client...</option>
                  {clientsList.map((c) => {
                    const unassigned = unassignedCountMap[c.id] ?? 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}{unassigned > 0 ? ` (${unassigned} unassigned)` : " (all assigned)"}
                      </option>
                    );
                  })}
                </Select>
              </FormGroup>

              <FormGroup label="Service / Task Type">
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

              <FormGroup label="Assign To (Employee)">
                <Select
                  value={sendTeam}
                  onChange={(e) => setSendTeam(e.target.value)}
                  error={sendAttempted && !sendTeam}
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} — {emp.department || "No dept"}
                    </option>
                  ))}
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
                  <label className="flex items-center gap-2 bg-gray-50 border border-gray-200 border-dashed rounded-lg px-3 py-2.5 cursor-pointer hover:border-indigo-400 transition-colors">
                    <Paperclip size={13} className="text-gray-400" />
                    <span className="text-[12px] text-gray-500">Click to attach a file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSendFile(f);
                      }}
                    />
                  </label>
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

      {/* =================== EDIT CLIENT MODAL =================== */}
      <Modal
        open={modalOpen && !!editTarget}
        onClose={() => {
          setModalOpen(false);
          resetAddForm();
        }}
        title="Edit Client"
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
            <Button loading={saving} onClick={handleSubmitClient}>Save Changes</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup label="Business Name">
            <Input
              placeholder="Business name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              error={attempted && !formName}
            />
          </FormGroup>
          <FormGroup label="Industry">
            <Select
              value={formIndustry}
              onChange={(e) => setFormIndustry(e.target.value)}
            >
              <option value="">Select industry...</option>
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
          <FormGroup label="Email">
            <Input
              type="email"
              placeholder="email@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </FormGroup>
        </FormRow>

        <FormGroup label="Services">
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

        <FormRow>
          <FormGroup label="MRR ($)">
            <Input
              type="number"
              placeholder="0"
              value={formMrr}
              onChange={(e) => setFormMrr(e.target.value)}
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

        <FormGroup label="Website">
          <Input
            placeholder="example.com"
            value={formWebsite}
            onChange={(e) => setFormWebsite(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Onboarding Checklist">
          <div className="flex flex-wrap gap-4 mt-1">
            <Checkbox
              label="Stripe Payment Done"
              checked={formStripe}
              onChange={() => setFormStripe(!formStripe)}
            />
            <Checkbox
              label="Onboarding Form Filled"
              checked={formOnboarding}
              onChange={() => setFormOnboarding(!formOnboarding)}
            />
            <Checkbox
              label="Agreement Signed"
              checked={formAgreement}
              onChange={() => setFormAgreement(!formAgreement)}
            />
          </div>
        </FormGroup>
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
