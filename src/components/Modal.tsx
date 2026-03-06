"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-[#111118] border border-[#242433] rounded-2xl p-4 sm:p-6 w-full max-w-[540px] max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-sm sm:text-base font-bold pr-2">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
        {actions && (
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-[#242433]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
