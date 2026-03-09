"use client";

import { useState, useEffect, useMemo } from "react";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/Loader";
import { StatCard, StatsRow } from "@/components/StatCard";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Textarea } from "@/components/FormGroup";
import { ServiceBadges } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import { useNotifications } from "@/hooks/useNotifications";
import type { Deal, Agent } from "@/lib/types";
import { Check, X, Clock } from "lucide-react";

export default function ApprovalsPage() {
  const { showToast } = useNotifications();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"deals" | "agents">("deals");

  // Deal approval state
  const [dealAction, setDealAction] = useState<{ id: number; type: "approve" | "reject" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Agent approval state
  const [agentAction, setAgentAction] = useState<{ id: number; type: "approve" | "reject" } | null>(null);
  const [processingAgent, setProcessingAgent] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ])
      .then(([d, a]) => {
        setDeals(Array.isArray(d) ? d : []);
        setAgents(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendingDeals = useMemo(() => deals.filter((d) => d.approval === "Pending"), [deals]);
  const pendingAgents = useMemo(() => agents.filter((a) => a.approval === "Pending"), [agents]);
  const totalPending = pendingDeals.length + pendingAgents.length;

  async function handleDealApproval() {
    if (!dealAction) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: dealAction.id,
          approval: dealAction.type === "approve" ? "Approved" : "Rejected",
          rejectionReason: dealAction.type === "reject" ? rejectionReason : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Error", data.error || "Failed to update deal", "error");
        setProcessing(false);
        return;
      }
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealAction.id
            ? { ...d, approval: dealAction.type === "approve" ? "Approved" : "Rejected", rejectionReason: dealAction.type === "reject" ? rejectionReason : null }
            : d
        )
      );
      showToast(
        dealAction.type === "approve" ? "Deal Approved" : "Deal Rejected",
        dealAction.type === "approve" ? "The deal has been approved and synced to clients" : "The deal has been rejected",
        dealAction.type === "approve" ? "success" : "error"
      );
    } catch {
      showToast("Error", "Something went wrong", "error");
    }
    setProcessing(false);
    setDealAction(null);
    setRejectionReason("");
  }

  async function handleAgentApproval() {
    if (!agentAction) return;
    setProcessingAgent(true);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: agentAction.id,
          approval: agentAction.type === "approve" ? "Approved" : "Rejected",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast("Error", data.error || "Failed to update agent", "error");
        setProcessingAgent(false);
        return;
      }
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentAction.id
            ? { ...a, approval: agentAction.type === "approve" ? "Approved" : "Rejected" }
            : a
        )
      );
      showToast(
        agentAction.type === "approve" ? "Agent Approved" : "Agent Rejected",
        agentAction.type === "approve" ? "The agent has been approved" : "The agent has been rejected",
        agentAction.type === "approve" ? "success" : "error"
      );
    } catch {
      showToast("Error", "Something went wrong", "error");
    }
    setProcessingAgent(false);
    setAgentAction(null);
  }

  if (loading) {
    return (
      <>
        <Topbar title="Approvals" />
        <PageLoader />
      </>
    );
  }

  const tabs = [
    { key: "deals" as const, label: "Deals", count: pendingDeals.length },
    { key: "agents" as const, label: "Agents", count: pendingAgents.length },
  ];

  return (
    <>
      <Topbar title="Approvals" />

      <div className="p-4 md:p-6">
        <StatsRow>
          <StatCard value={String(totalPending)} label="Total Pending" valueColor="yellow" />
          <StatCard value={String(pendingDeals.length)} label="Pending Deals" />
          <StatCard value={String(pendingAgents.length)} label="Pending Agents" />
          <StatCard value={String(deals.filter((d) => d.approval === "Approved").length)} label="Approved Deals" valueColor="green" />
        </StatsRow>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-white border border-gray-200 rounded-lg p-0.5 w-fit mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-indigo-500 text-white font-semibold"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold ${
                activeTab === tab.key ? "bg-white/80 text-black" : "bg-gray-200 text-gray-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Pending Deals */}
        {activeTab === "deals" && (
          <div className="space-y-3">
            {pendingDeals.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-16">No pending deals to approve.</div>
            ) : (
              pendingDeals.map((deal) => (
                <div key={deal.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={deal.client} />
                      <div>
                        <span className="text-[13px] font-semibold text-gray-800">{deal.client}</span>
                        <div className="text-[10px] text-gray-500">{deal.industry}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                      <Clock size={10} />
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-[11px]">
                    <div>
                      <span className="text-gray-400">Agent</span>
                      <div className="text-gray-700 font-medium">{deal.agent}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">MRR</span>
                      <div className="text-emerald-600 font-mono font-medium">${deal.mrr.toLocaleString()}/mo</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Stage</span>
                      <div className="text-gray-700 font-medium">{deal.stage}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Submitted By</span>
                      <div className="text-gray-700 font-medium">{deal.submittedBy || "—"}</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <ServiceBadges services={deal.services} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="!bg-emerald-500 !text-white !border-emerald-500 hover:!bg-emerald-600"
                      onClick={() => setDealAction({ id: deal.id, type: "approve" })}
                    >
                      <Check size={13} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-red-600 !border-red-200 hover:!bg-red-50"
                      onClick={() => setDealAction({ id: deal.id, type: "reject" })}
                    >
                      <X size={13} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pending Agents */}
        {activeTab === "agents" && (
          <div className="space-y-3">
            {pendingAgents.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-16">No pending agents to approve.</div>
            ) : (
              pendingAgents.map((agent) => (
                <div key={agent.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={agent.name} />
                      <div>
                        <span className="text-[13px] font-semibold text-gray-800">{agent.name}</span>
                        <div className="text-[10px] text-gray-500">{agent.email}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                      <Clock size={10} />
                      Pending
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 text-[11px]">
                    <div>
                      <span className="text-gray-400">Agency</span>
                      <div className="text-gray-700 font-medium">{agent.agency}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Commission Rate</span>
                      <div className="text-gray-700 font-medium">{agent.commission}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Status</span>
                      <div className="text-gray-700 font-medium">{agent.status}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="!bg-emerald-500 !text-white !border-emerald-500 hover:!bg-emerald-600"
                      onClick={() => setAgentAction({ id: agent.id, type: "approve" })}
                    >
                      <Check size={13} className="mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-red-600 !border-red-200 hover:!bg-red-50"
                      onClick={() => setAgentAction({ id: agent.id, type: "reject" })}
                    >
                      <X size={13} className="mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Deal Approval Confirmation */}
      <Modal
        open={!!dealAction}
        onClose={() => { setDealAction(null); setRejectionReason(""); }}
        title={dealAction?.type === "approve" ? "Approve Deal" : "Reject Deal"}
        actions={
          <>
            <Button variant="ghost" onClick={() => { setDealAction(null); setRejectionReason(""); }}>Cancel</Button>
            <Button
              loading={processing}
              onClick={handleDealApproval}
              className={dealAction?.type === "approve" ? "!bg-emerald-500 !border-emerald-500 !text-white" : "!bg-red-500 !border-red-500 !text-white"}
            >
              {dealAction?.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </>
        }
      >
        {dealAction?.type === "approve" ? (
          <p className="text-sm text-gray-700">
            This will approve the deal and automatically create/update the corresponding client record. Are you sure?
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              Please provide a reason for rejecting this deal (optional).
            </p>
            <Textarea
              placeholder="Rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Agent Approval Confirmation */}
      <Modal
        open={!!agentAction}
        onClose={() => setAgentAction(null)}
        title={agentAction?.type === "approve" ? "Approve Agent" : "Reject Agent"}
        actions={
          <>
            <Button variant="ghost" onClick={() => setAgentAction(null)}>Cancel</Button>
            <Button
              loading={processingAgent}
              onClick={handleAgentApproval}
              className={agentAction?.type === "approve" ? "!bg-emerald-500 !border-emerald-500 !text-white" : "!bg-red-500 !border-red-500 !text-white"}
            >
              {agentAction?.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          {agentAction?.type === "approve"
            ? "This will approve the agent and allow them to log in and start working. Are you sure?"
            : "This will reject the agent. They will not be able to access the system. Are you sure?"}
        </p>
      </Modal>
    </>
  );
}
