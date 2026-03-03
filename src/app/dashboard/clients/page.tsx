"use client";

import { useState, useEffect } from "react";
import { Topbar, Tabs } from "@/components/Topbar";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Card, DataTable } from "@/components/DataTable";
import {
  StatusBadge,
  ServiceBadge,
  ServiceBadges,
  PrioBadge,
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
  SVC_BADGE,
  TEAMS,
} from "@/lib/types";
import { Trash2, Pencil, Users as UsersIcon, DollarSign, Layers, ThumbsUp } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [sentTasks, setSentTasks] = useState<Task[]>([]);

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

  // Send to backend form state
  const [sendClientId, setSendClientId] = useState("");
  const [sendService, setSendService] = useState("");
  const [sendTeam, setSendTeam] = useState("");
  const [sendPriority, setSendPriority] = useState("Normal");
  const [sendDue, setSendDue] = useState("");
  const [sendNotes, setSendNotes] = useState("");

  /* ---------- fetch data ---------- */

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ])
      .then(([c, t]) => {
        setClientsList(Array.isArray(c) ? c : []);
        setTasksList(Array.isArray(t) ? t : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ---------- helpers ---------- */

  const activeClients = clientsList.filter((c) => c.status === "Active");
  const totalMrr = clientsList.reduce((sum, c) => sum + c.mrr, 0);

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
    setEditTarget(null);
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
    setModalOpen(true);
  }

  function handleSubmitClient() {
    if (!formName) return;

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
      };
      fetch("/api/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      })
        .then((r) => r.json())
        .then((saved) => {
          setClientsList((prev) =>
            prev.map((c) => (c.id === editTarget.id ? saved : c))
          );
        })
        .catch(() => {
          setClientsList((prev) =>
            prev.map((c) => (c.id === editTarget.id ? updated : c))
          );
        });
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
      };
      fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      })
        .then((r) => r.json())
        .then((saved) => {
          setClientsList((prev) => [...prev, saved]);
        })
        .catch(() => {
          setClientsList((prev) => [...prev, newClient]);
        });
    }

    setModalOpen(false);
    resetAddForm();
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

  function handleSendToBackend() {
    if (!sendClientId || !sendService || !sendTeam) return;
    const client = clientsList.find((c) => c.id === Number(sendClientId));
    if (!client) return;
    const newTask: Task = {
      id: Math.max(0, ...tasksList.map((t) => t.id)) + 1,
      client: client.name,
      service: sendService,
      team: sendTeam,
      priority: sendPriority as Task["priority"],
      due: sendDue,
      notes: sendNotes,
      status: "Queued",
      logs: [],
    };
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTask),
    })
      .then((r) => r.json())
      .then((saved) => {
        setTasksList((prev) => [...prev, saved]);
        setSentTasks((prev) => [saved, ...prev]);
      })
      .catch(() => {
        setTasksList((prev) => [...prev, newTask]);
        setSentTasks((prev) => [newTask, ...prev]);
      });
    setSendClientId("");
    setSendService("");
    setSendTeam("");
    setSendPriority("Normal");
    setSendDue("");
    setSendNotes("");
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
            <div className="font-medium text-gray-100">{c.name}</div>
            <div className="text-[10px] text-gray-500">{c.website}</div>
          </div>
        </div>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      render: (c: Client) => (
        <span className="text-gray-400">{c.industry}</span>
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
        <span className="text-emerald-400 font-mono">
          ${c.mrr.toLocaleString()}
        </span>
      ),
    },
    {
      key: "since",
      header: "Since",
      render: (c: Client) => (
        <span className="font-mono text-gray-400">{c.start}</span>
      ),
    },
    {
      key: "rep",
      header: "Rep",
      render: (c: Client) => (
        <span className="text-gray-400">{c.rep}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: Client) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions",
      header: "",
      render: (c: Client) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(c)}
            className="text-gray-600 hover:text-indigo-400 transition-colors p-1 cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="text-gray-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
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
        <Topbar title="Clients & Services">
          <Button onClick={() => setModalOpen(true)}>+ Add Client</Button>
        </Topbar>
        <PageLoader />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Topbar title="Clients & Services">
        <Button onClick={() => setModalOpen(true)}>+ Add Client</Button>
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
                icon={UsersIcon}
                iconColor="blue"
              />
              <StatCard
                value={`$${totalMrr.toLocaleString()}`}
                label="MRR"
                valueColor="green"
                icon={DollarSign}
              />
              <StatCard value="5" label="Industries" icon={Layers} iconColor="purple" />
              <StatCard value="97%" label="Satisfaction" icon={ThumbsUp} iconColor="teal" />
            </StatsRow>

            <Card title="Client Roster" actions={null}>
              <DataTable columns={clientColumns} data={clientsList} />
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
                    <h3 className="text-sm font-bold text-gray-100">
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
                      className="bg-[#09090f] border border-[#242433] rounded-lg p-3"
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Left: Create task form */}
            <Card title="Create Backend Task">
              <FormGroup label="Client">
                <Select
                  value={sendClientId}
                  onChange={(e) => setSendClientId(e.target.value)}
                >
                  <option value="">Select client...</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup label="Service / Task Type">
                <Select
                  value={sendService}
                  onChange={(e) => setSendService(e.target.value)}
                >
                  <option value="">Select service...</option>
                  {SERVICE_OPTIONS.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc} -- {SVC_DESC[svc]}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup label="Backend Team">
                <Select
                  value={sendTeam}
                  onChange={(e) => setSendTeam(e.target.value)}
                >
                  <option value="">Select team...</option>
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
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

              <Button
                className="w-full"
                onClick={handleSendToBackend}
              >
                Send to Backend
              </Button>
            </Card>

            {/* Right: Recently Sent */}
            <Card title="Recently Sent">
              {sentTasks.length === 0 ? (
                <p className="text-gray-600 text-xs py-6 text-center">
                  No tasks sent yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {sentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#09090f] border border-[#242433] rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12.5px] font-semibold text-gray-100">
                          {task.client}
                        </span>
                        <PrioBadge priority={task.priority} />
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {task.service} &middot; {task.team}
                      </p>
                      {task.due && (
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                          Due: {task.due}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* =================== ADD CLIENT MODAL =================== */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetAddForm();
        }}
        title={editTarget ? "Edit Client" : "Add Client"}
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
            <Button onClick={handleSubmitClient}>{editTarget ? "Save Changes" : "Add Client"}</Button>
          </>
        }
      >
        <FormRow>
          <FormGroup label="Business Name">
            <Input
              placeholder="Business name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
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
