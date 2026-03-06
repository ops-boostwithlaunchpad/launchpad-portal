"use client";

import { useState, useEffect } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { FormGroup, Select, Textarea } from "./FormGroup";
import { Button } from "./Button";
import { CancellationConfirmModal } from "./CancellationConfirmModal";
import { AlertTriangle, CheckCircle, Mail, RotateCcw, XCircle } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

function getClientSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const CANCELLATION_REASONS = [
  "Budget constraints",
  "Not seeing expected results",
  "Switching to another provider",
  "Handling marketing in-house",
  "Business closing/downsizing",
  "Service not needed anymore",
  "Other",
];

function getNoticeEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface CancellationFormProps {
  email: string;
}

type FormStatus =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; noticeEndDate: string }
  | { type: "cancelled" }
  | { type: "error"; code: number; message: string };

export function CancellationForm({ email }: CancellationFormProps) {
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelCancellationModal, setShowCancelCancellationModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [supabaseClientId, setSupabaseClientId] = useState<number | null>(null);
  const [clientIdError, setClientIdError] = useState(false);

  const noticeEndDate = getNoticeEndDate();
  const canSubmit = reason && confirmed;

  // Resolve client_id from Supabase clients table on mount
  useEffect(() => {
    const supabase = getClientSupabase();
    if (!supabase) {
      setClientIdError(true);
      return;
    }
    supabase
      .from("clients")
      .select("id")
      .eq("client_email", email)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setClientIdError(true);
        } else {
          setSupabaseClientId(data.id);
        }
      });
  }, [email]);

  async function handleSubmit() {
    if (supabaseClientId === null) {
      setStatus({
        type: "error",
        code: 0,
        message:
          "Your account could not be found. Please contact support at sebastian@boostwithlaunchpad.com",
      });
      setShowConfirmModal(false);
      return;
    }

    setStatus({ type: "submitting" });
    try {
      const res = await fetch(
        "https://n8n.launchpadautomation.com/webhook-test/cancellation-request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: supabaseClientId,
            reason,
            feedback: feedback || undefined,
            requested_by: email,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus({
          type: "success",
          noticeEndDate: data.notice_end_date || noticeEndDate,
        });
      } else if (res.status === 404) {
        setStatus({
          type: "error",
          code: 404,
          message: "Account not found. Please contact support.",
        });
      } else if (res.status === 409) {
        setStatus({
          type: "error",
          code: 409,
          message:
            "A cancellation request is already in progress for your account.",
        });
      } else {
        setStatus({
          type: "error",
          code: res.status,
          message:
            "Something went wrong. Please try again or contact support.",
        });
      }
    } catch {
      setStatus({
        type: "error",
        code: 0,
        message: "Network error. Please check your connection and try again.",
      });
    }
    setShowConfirmModal(false);
  }

  async function handleCancelCancellation() {
    setWithdrawing(true);
    try {
      const res = await fetch(
        "https://n8n.launchpadautomation.com/webhook-test/cancel-cancellation-request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: supabaseClientId,
            requested_by: email,
          }),
        }
      );

      if (res.ok) {
        setStatus({ type: "cancelled" });
      } else {
        setStatus({
          type: "error",
          code: res.status,
          message: "Failed to withdraw cancellation. Please contact support.",
        });
      }
    } catch {
      setStatus({
        type: "error",
        code: 0,
        message: "Network error. Please check your connection and try again.",
      });
    }
    setWithdrawing(false);
    setShowCancelCancellationModal(false);
  }

  if (status.type === "cancelled") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-600" />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-2">
          Cancellation Withdrawn
        </h2>
        <p className="text-[12.5px] text-gray-600 leading-relaxed">
          Your cancellation request has been withdrawn. Your services will
          continue as normal.
        </p>
      </div>
    );
  }

  if (status.type === "success") {
    return (
      <>
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">
            Cancellation Request Received
          </h2>
          <p className="text-[12.5px] text-gray-600 leading-relaxed mb-4">
            Your services will continue through{" "}
            <strong>{status.noticeEndDate}</strong>. You&apos;ll receive a
            confirmation email shortly.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 font-medium mb-5">
            <AlertTriangle size={12} />
            Cancellation in progress
          </div>
          <div className="border-t border-gray-200 pt-4 mt-1">
            <p className="text-[11.5px] text-gray-500 mb-3">Changed your mind?</p>
            <button
              onClick={() => setShowCancelCancellationModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw size={13} />
              Withdraw Cancellation
            </button>
          </div>
        </div>

        <ConfirmModal
          open={showCancelCancellationModal}
          onClose={() => setShowCancelCancellationModal(false)}
          onConfirm={handleCancelCancellation}
          title="Withdraw Cancellation"
          message="Are you sure you want to withdraw your cancellation request? Your services will continue as normal."
          confirmLabel={withdrawing ? "Withdrawing..." : "Yes, Withdraw"}
          loading={withdrawing}
        />
      </>
    );
  }

  if (clientIdError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12.5px] text-red-700">
            Your account could not be found. Please contact support at{" "}
            <a href="mailto:sebastian@boostwithlaunchpad.com" className="underline font-medium">
              sebastian@boostwithlaunchpad.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Retention message */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 sm:p-5 mb-5">
        <p className="text-[12.5px] text-purple-800 leading-relaxed mb-3">
          Before you go — have you spoken with your account manager? We may be
          able to adjust your plan or address your concerns.
        </p>
        <a
          href="mailto:sebastian@boostwithlaunchpad.com"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-700 text-white rounded-lg text-[12px] font-medium hover:bg-purple-800 transition-colors"
        >
          <Mail size={13} />
          Talk to us instead
        </a>
      </div>

      {/* Error banner */}
      {status.type === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-start gap-3">
          <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[12.5px] text-red-700">{status.message}</p>
            {status.code !== 404 && status.code !== 409 && (
              <button
                onClick={() => setStatus({ type: "idle" })}
                className="text-[11px] text-red-600 underline mt-1 hover:text-red-800"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <FormGroup label="Reason for cancellation *">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={status.type === "submitting"}
          >
            <option value="">Select a reason...</option>
            {CANCELLATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup label="Additional feedback">
          <Textarea
            placeholder="Help us improve — what could we have done better?"
            value={feedback}
            onChange={(e) =>
              setFeedback(e.target.value.slice(0, 500))
            }
            maxLength={500}
            disabled={status.type === "submitting"}
          />
          <div className="text-right text-[10px] text-gray-400 mt-1">
            {feedback.length}/500
          </div>
        </FormGroup>

        <label className="flex items-start gap-2 text-[11.5px] cursor-pointer text-gray-700 mb-5 mt-1">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={() => setConfirmed(!confirmed)}
            className="accent-purple-700 mt-0.5"
            disabled={status.type === "submitting"}
          />
          <span className="leading-relaxed">
            I understand there is a 30-day notice period and my services will
            continue until <strong>{noticeEndDate}</strong>
          </span>
        </label>

        <Button
          variant="danger"
          onClick={() => setShowConfirmModal(true)}
          disabled={!canSubmit || status.type === "submitting"}
        >
          Submit Cancellation Request
        </Button>
      </div>

      <CancellationConfirmModal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSubmit}
        loading={status.type === "submitting"}
        noticeEndDate={noticeEndDate}
      />
    </>
  );
}
