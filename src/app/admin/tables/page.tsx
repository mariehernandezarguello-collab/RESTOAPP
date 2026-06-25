import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TablesClient } from "./TablesClient";
import { createClient } from "@/lib/supabase/server";

export default async function TablesPage() {
  const supabase = await createClient();
  const { data: tables } = await supabase
    .from("tables")
    .select("*")
    .order("position");

  return (
    <DashboardLayout requiredRole="admin">
      <TablesClient initialTables={tables ?? []} />
    </DashboardLayout>
  );
}
