"use client";

import { useState, useMemo, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { Card } from "@/components/DataTable";
import { Badge, ServiceBadge, StatusBadge } from "@/components/Badge";
import { Select } from "@/components/FormGroup";
import { Client, Task } from "@/lib/types";
import { SVC_DESC } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, Clock, FileSearch, LayoutList, User } from "lucide-react";

export default function CustomerPortalPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState(0);

  const isClientRole = user?.role === "client";

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((res) => res.json()),
      fetch("/api/tasks").then((res) => res.json()),
    ])
      .then(([clientsData, tasksData]) => {
        const c = Array.isArray(clientsData) ? clientsData : [];
        const t = Array.isArray(tasksData) ? tasksData : [];

        if (isClientRole && user?.email) {
          const myClient = c.find((cl: Client) => cl.email === user.email);
          if (myClient) {
            setClients([myClient]);
            setSelectedClientId(myClient.id);
          } else {
            setClients([]);
          }
        } else {
          setClients(c);
          if (c.length > 0) {
            setSelectedClientId(c[0].id);
          }
        }
        setAllTasks(t);
      })
      .finally(() => setLoading(false));
  }, [isClientRole, user?.email]);

  const client = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const clientTasks = useMemo(
    () => (client ? allTasks.filter((t) => t.clientId === client.id || t.client === client.name) : []),
    [client, allTasks]
  );

  const doneCount = clientTasks.filter((t) => t.status === "Done").length;
  const inProgressCount = clientTasks.filter((t) => t.status === "In Progress").length;
  const reviewCount = clientTasks.filter((t) => t.status === "Review").length;
  const queuedCount = clientTasks.filter((t) => t.status === "Queued").length;
  const overallProgress = clientTasks.length
    ? Math.round(clientTasks.reduce((sum, t) => sum + (t.progress ?? 0), 0) / clientTasks.length)
    : 0;

  if (loading) {
    return (
      <>
        <Topbar title="Customer Portal" />
        <PageLoader />
      </>
    );
  }

  if (!client) {
    return (
      <>
        <Topbar title="Customer Portal" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 text-sm mb-2">No client record found for your account.</div>
            <div className="text-gray-400 text-xs">Please contact your account manager.</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Customer Portal">
        {!isClientRole && (
          <Select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(Number(e.target.value))}
            className="!w-full sm:!w-[200px]"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        <Badge color="blue">Client View</Badge>
      </Topbar>

      <div className="p-4 md:p-6 flex-1">
        {/* Welcome Header */}
        <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 border border-gray-200 rounded-2xl p-5 sm:p-7 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[9px] text-indigo-600 uppercase tracking-[2px] mb-1.5">
                Boost with Launchpad
              </div>
              <h2 className="text-xl md:text-2xl font-bold font-serif mb-1">{client.name}</h2>
              <p className="text-xs text-gray-500">
                {client.industry} &middot; Client since {client.start} &middot; Rep: {client.rep}
              </p>
            </div>
            {/* Overall Progress Ring */}
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="50%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="28" fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="4"
                    strokeDasharray={`${(overallProgress / 100) * 175.93} 175.93`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                  {overallProgress}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Overall<br />Progress
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <LayoutList size={14} className="text-gray-400" />
                <span className="text-lg font-bold font-serif text-gray-800">{clientTasks.length}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">Total</div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Clock size={14} className="text-amber-500" />
                <span className="text-lg font-bold font-serif text-amber-600">{inProgressCount}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">In Progress</div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <FileSearch size={14} className="text-indigo-500" />
                <span className="text-lg font-bold font-serif text-indigo-600">{reviewCount}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">In Review</div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 text-center border border-white">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-lg font-bold font-serif text-emerald-600">{doneCount}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">Completed</div>
            </div>
          </div>
        </div>

        {/* Services with real progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2.5">
              Your Services
            </div>
            <div className="space-y-2.5">
              {client.services.map((s) => {
                const svcTask = clientTasks.find((t) => t.service === s);
                const svcStatus = svcTask?.status || "Queued";
                const svcProgress = svcTask?.progress ?? 0;
                const badgeLabel = svcTask ? svcStatus : "Pending";

                return (
                  <div
                    key={s}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <div className="font-semibold text-[13px]">{s}</div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5">
                          {SVC_DESC[s] || ""}
                        </div>
                      </div>
                      <StatusBadge status={badgeLabel} />
                    </div>
                    {svcTask?.assignedToName && (
                      <div className="flex items-center gap-1 text-[10.5px] text-gray-500 mb-2">
                        <User size={11} className="text-gray-400" />
                        {svcTask.assignedToName}
                      </div>
                    )}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${svcProgress}%`, background: svcProgress > 0 ? "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" : undefined }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1.5 font-medium">
                      {svcProgress}% complete
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2.5">
              Recent Activity
            </div>
            <Card>
              {clientTasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {clientTasks
                    .filter((t) => t.logs.length > 0 || t.status !== "Queued")
                    .slice(0, 8)
                    .map((t) => (
                      <div key={t.id} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <ServiceBadge service={t.service} />
                            <span className="text-[12px] font-medium text-gray-800">
                              {t.assignedToName || "Unassigned"}
                            </span>
                          </div>
                          <StatusBadge status={t.status} />
                        </div>
                        {t.logs.length > 0 && (
                          <div className="text-[10.5px] text-gray-500 ml-0.5 mt-1">
                            {t.logs[t.logs.length - 1]}
                          </div>
                        )}
                        {t.status === "In Progress" && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${t.progress ?? 0}%`, background: "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-gray-500">{t.progress ?? 0}%</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs py-2">No activity yet.</div>
              )}
            </Card>

            {/* Account Info Card */}
            <div className="mt-3">
              <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2.5">
                Account Details
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Contact</span>
                  <span className="text-[11px] font-medium text-gray-800">{client.contact}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Email</span>
                  <span className="text-[11px] font-medium text-gray-800">{client.email}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Services</span>
                  <span className="text-[11px] font-medium text-gray-800">{client.services.length} active</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Status</span>
                  <Badge color={client.status === "Active" ? "green" : client.status === "Paused" ? "yellow" : "red"}>
                    {client.status}
                  </Badge>
                </div>
                {client.website && (
                  <>
                    <div className="h-px bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Website</span>
                      <span className="text-[11px] font-medium text-indigo-600">{client.website}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* All Tasks Grid */}
        {clientTasks.length > 0 && (
          <Card title="All Tasks & Deliverables">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {clientTasks.map((t) => (
                <div key={t.id} className="border border-gray-200 rounded-lg p-3.5 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <ServiceBadge service={t.service} />
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-[12.5px] font-medium text-gray-800 mb-1">{t.service}</div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-gray-500 mb-2.5">
                    {t.assignedToName && (
                      <>
                        <User size={11} className="text-gray-400" />
                        <span>{t.assignedToName}</span>
                        <span className="text-gray-300">&middot;</span>
                      </>
                    )}
                    <span>{t.team}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${t.progress ?? 0}%`, background: (t.progress ?? 0) > 0 ? "linear-gradient(to right, #f59e0b, #6366f1, #10b981)" : undefined }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 min-w-[28px] text-right">{t.progress ?? 0}%</span>
                  </div>
                  {t.due && (
                    <div className="text-[10px] text-gray-400 mt-2 font-mono">Due: {t.due}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {queuedCount > 0 && clientTasks.length > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-center">
            <p className="text-[11px] text-amber-700">
              {queuedCount} service{queuedCount > 1 ? "s are" : " is"} queued and will begin shortly. Your team is getting everything ready.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
