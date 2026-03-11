"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, actions, wide }: ModalProps) {
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
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className={`bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 w-full ${wide ? "max-w-[720px]" : "max-w-[540px]"} max-h-[94vh] sm:max-h-[80vh] overflow-y-auto shadow-xl`}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 pr-2">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
        {actions && (
          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-200">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
