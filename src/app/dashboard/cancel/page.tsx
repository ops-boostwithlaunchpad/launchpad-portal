"use client";

import { useAuth } from "@/lib/AuthContext";
import { Topbar } from "@/components/Topbar";
import { CancellationForm } from "@/components/CancellationForm";

export default function CancelPage() {
  const { user } = useAuth();

  if (user?.role !== "client") {
    return (
      <>
        <Topbar title="Cancel Services" />
        <div className="p-4 md:p-6 flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">
            This page is only available for client accounts.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Cancel Services" />
      <div className="p-4 md:p-6 flex-1">
        <div className="max-w-xl mx-auto">
          <h1 className="text-base font-bold text-gray-900 mb-1">
            We&apos;re sorry to see you go
          </h1>
          <p className="text-[12.5px] text-gray-500 mb-5">
            Please let us know why you&apos;re leaving so we can improve.
          </p>
          <CancellationForm email={user.email!} />
        </div>
      </div>
    </>
  );
}
