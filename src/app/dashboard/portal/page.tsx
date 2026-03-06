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

const updateLabels = ["Completed", "Reported", "Submitted", "Published", "Updated"];
const updateTimes = [
  "Today, 10:32 AM",
  "Yesterday, 3:15 PM",
  "2 days ago, 11:00 AM",
  "3 days ago, 2:00 PM",
  "Last week",
];

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
          // Client users only see their own data matched by email
          const myClient = c.find((cl: Client) => cl.email === user.email);
          if (myClient) {
            setClients([myClient]);
            setSelectedClientId(myClient.id);
          } else {
            setClients([]);
          }
        } else {
          // Admin can see all clients
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
    () => (client ? allTasks.filter((t) => t.client === client.name) : []),
    [client, allTasks]
  );

  const doneCount = clientTasks.filter((t) => t.status === "Done").length;
  const pct = clientTasks.length ? Math.round((doneCount / clientTasks.length) * 100) : 0;

  // Simulated metrics
  const traffic = useMemo(() => Math.floor(Math.random() * 200 + 150), [selectedClientId]);
  const rank = useMemo(() => Math.floor(Math.random() * 3 + 1), [selectedClientId]);

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

  const statusColor: Record<string, string> = {
    Queued: "gray",
    "In Progress": "yellow",
    Review: "blue",
    Done: "green",
  };

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
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-gray-200 rounded-2xl p-4 sm:p-6 md:p-8 mb-5 text-center">
          <div className="text-[9px] text-indigo-600 uppercase tracking-[2px] mb-2">
            Boost with Launchpad
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif mb-1">{client.name}</h2>
          <p className="text-xs text-gray-500">
            {client.industry} &middot; Client since {client.start}
          </p>

          <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-6 md:gap-10 justify-center mt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-bold font-serif text-emerald-600">
                  +{traffic}%
                </span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                Organic Traffic
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-bold font-serif">{rank}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                GBP Ranking
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-bold font-serif text-indigo-600">
                  {clientTasks.length}
                </span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                Active Tasks
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-2xl font-bold font-serif text-amber-600">{pct}%</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                This Month
              </div>
            </div>
          </div>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3.5">
          {/* Services */}
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2.5">
              Your Services
            </div>
            <div className="space-y-2.5">
              {client.services.map((s) => {
                const progress = Math.floor(Math.random() * 40 + 40);
                return (
                  <div
                    key={s}
                    className="bg-white border border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-[13px]">{s}</div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5">
                          {SVC_DESC[s] || ""}
                        </div>
                      </div>
                      <Badge color="green">Active</Badge>
                    </div>
                    <div className="h-[3px] bg-gray-200 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1.5">
                      {progress}% complete this cycle
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Updates */}
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-2.5">
              Recent Updates
            </div>
            <Card>
              {clientTasks.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {clientTasks.slice(0, 5).map((t, i) => (
                      <div key={t.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div>
                          <div className="text-[12.5px]">
                            {t.service} — {updateLabels[i % updateLabels.length]}
                          </div>
                          <div className="text-[10.5px] text-gray-500 mt-0.5">
                            {updateTimes[i % updateTimes.length]}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs py-2">No updates yet.</div>
              )}
            </Card>
          </div>
        </div>

        {/* Tasks Table */}
        <Card title="All Tasks & Deliverables">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full border-collapse text-[12.5px] min-w-[500px]">
              <thead>
                <tr>
                  {["Task", "Service", "Team", "Status", "Due Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-gray-200 font-semibold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientTasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      {t.service} work
                    </td>
                    <td className="px-3 py-2.5">
                      <ServiceBadge service={t.service} />
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px]">
                      {t.assignedToName || t.team}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-500">{t.due}</td>
                  </tr>
                ))}
                {clientTasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center text-gray-500 py-8 text-xs"
                    >
                      No tasks assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
