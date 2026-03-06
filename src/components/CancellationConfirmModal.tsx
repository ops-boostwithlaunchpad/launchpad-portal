"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

interface CancellationConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  noticeEndDate: string;
}

export function CancellationConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  noticeEndDate,
}: CancellationConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Cancellation"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Go Back
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Submitting..." : "Yes, Cancel My Services"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          Are you sure? This will start a <strong>30-day cancellation notice period</strong>.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your services will continue through <strong>{noticeEndDate}</strong>.
        </p>
        <p className="text-xs text-gray-400">
          This action cannot be undone. You will receive a confirmation email shortly after submission.
        </p>
      </div>
    </Modal>
  );
}
