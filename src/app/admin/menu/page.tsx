import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MenuClient } from "./MenuClient";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("menu_items")
    .select("*")
    .order("category")
    .order("name");

  return (
    <DashboardLayout requiredRole="admin">
      <MenuClient initialItems={items ?? []} />
    </DashboardLayout>
  );
}
