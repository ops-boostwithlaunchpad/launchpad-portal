"use client";

import { useState, useMemo, useEffect } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { Card } from "@/components/DataTable";
import { Badge, ServiceBadge, StatusBadge } from "@/components/Badge";
import { Select } from "@/components/FormGroup";
import { Client, Task } from "@/lib/types";
import { SVC_DESC } from "@/lib/types";
import {
  TrendingUp,
  Hash,
  ListChecks,
  Percent,
  FileText,
  Zap,
  CheckCircle,
  Clock,
  Send,
  BarChart3,
} from "lucide-react";

const updateIcons = [CheckCircle, BarChart3, Send, FileText, Zap];
const updateLabels = ["Completed", "Reported", "Submitted", "Published", "Updated"];
const updateTimes = [
  "Today, 10:32 AM",
  "Yesterday, 3:15 PM",
  "2 days ago, 11:00 AM",
  "3 days ago, 2:00 PM",
  "Last week",
];

export default function CustomerPortalPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((res) => res.json()),
      fetch("/api/tasks").then((res) => res.json()),
    ])
      .then(([clientsData, tasksData]) => {
        const c = Array.isArray(clientsData) ? clientsData : [];
        const t = Array.isArray(tasksData) ? tasksData : [];
        setClients(c);
        setAllTasks(t);
        if (c.length > 0) {
          setSelectedClientId(c[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

  if (!client) return null;

  const statusColor: Record<string, string> = {
    Queued: "gray",
    "In Progress": "yellow",
    Review: "blue",
    Done: "green",
  };

  return (
    <>
      <Topbar title="Customer Portal">
        <Select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(Number(e.target.value))}
          className="!w-[200px]"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Badge color="blue">Client View</Badge>
      </Topbar>

      <div className="p-4 md:p-6 flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/5 border border-[#242433] rounded-2xl p-6 md:p-8 mb-5 text-center">
          <div className="text-[9px] text-indigo-400 uppercase tracking-[2px] mb-2">
            Boost with Launchpad
          </div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif mb-1">{client.name}</h2>
          <p className="text-xs text-gray-500">
            {client.industry} &middot; Client since {client.start}
          </p>

          <div className="flex gap-6 md:gap-10 justify-center mt-6 flex-wrap">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp size={16} className="text-emerald-400" />
                <span className="text-2xl font-bold font-serif text-emerald-400">
                  +{traffic}%
                </span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                Organic Traffic
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Hash size={16} className="text-gray-200" />
                <span className="text-2xl font-bold font-serif">{rank}</span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                GBP Ranking
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <ListChecks size={16} className="text-indigo-400" />
                <span className="text-2xl font-bold font-serif text-indigo-400">
                  {clientTasks.length}
                </span>
              </div>
              <div className="text-[9.5px] text-gray-500 uppercase tracking-wide">
                Active Tasks
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Percent size={16} className="text-amber-400" />
                <span className="text-2xl font-bold font-serif text-amber-400">{pct}%</span>
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
                    className="bg-[#111118] border border-[#242433] rounded-xl p-4"
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
                    <div className="h-[3px] bg-[#242433] rounded-full overflow-hidden mt-2">
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
                <div className="divide-y divide-[#242433]/50">
                  {clientTasks.slice(0, 5).map((t, i) => {
                    const Icon = updateIcons[i % updateIcons.length];
                    return (
                      <div key={t.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                          <Icon size={13} />
                        </div>
                        <div>
                          <div className="text-[12.5px]">
                            {t.service} — {updateLabels[i % updateLabels.length]}
                          </div>
                          <div className="text-[10.5px] text-gray-500 mt-0.5">
                            {updateTimes[i % updateTimes.length]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500 text-xs py-2">No updates yet.</div>
              )}
            </Card>
          </div>
        </div>

        {/* Tasks Table */}
        <Card title="All Tasks & Deliverables">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {["Task", "Service", "Team", "Status", "Due Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-[9.5px] text-gray-500 uppercase tracking-wider border-b border-[#242433] font-semibold"
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
                    className="border-b border-[#242433]/60 hover:bg-[#1a1a26] transition-colors"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-gray-500" />
                        {t.service} work
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <ServiceBadge service={t.service} />
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11px]">{t.team}</td>
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
