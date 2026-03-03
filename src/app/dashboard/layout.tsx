import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">{children}</main>
      </div>
    </AuthProvider>
  );
}
