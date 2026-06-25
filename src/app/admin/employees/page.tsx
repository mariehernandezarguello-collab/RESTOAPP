import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EmployeesClient } from "./EmployeesClient";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <DashboardLayout requiredRole="admin">
      <EmployeesClient initialEmployees={employees ?? []} />
    </DashboardLayout>
  );
}
