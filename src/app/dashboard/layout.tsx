import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthContext";
import { NotificationProvider } from "@/hooks/useNotifications";
import { ToastContainer } from "@/components/ToastNotification";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  console.log("DashboardLayout rendered",process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">{children}</main>
        </div>
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}
