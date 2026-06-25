import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Role } from "@/types";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: Role | Role[];
}

export async function DashboardLayout({
  children,
  requiredRole,
}: DashboardLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : requiredRole
    ? [requiredRole]
    : null;

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const redirectMap: Record<string, string> = {
      admin: "/admin/dashboard",
      waiter: "/waiter/orders",
      kitchen: "/kitchen/queue",
      cashier: "/cashier/billing",
    };
    redirect(redirectMap[profile.role] ?? "/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
