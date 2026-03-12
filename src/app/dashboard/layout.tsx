import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthContext";
import { PresenceProvider } from "@/lib/PresenceContext";
import { NotificationProvider } from "@/hooks/useNotifications";
import { ToastContainer } from "@/components/ToastNotification";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PresenceProvider>
        <NotificationProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto flex flex-col min-h-screen">{children}</main>
          </div>
          <ToastContainer />
        </NotificationProvider>
      </PresenceProvider>
    </AuthProvider>
  );
}
