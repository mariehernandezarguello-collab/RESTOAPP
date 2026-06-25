import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { KitchenClient } from "./KitchenClient";
import { createClient } from "@/lib/supabase/server";

export default async function KitchenPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, table:tables(name), waiter:profiles(full_name), items:order_items(*, menu_item:menu_items(name))")
    .in("status", ["pending", "preparing"])
    .order("created_at");

  return (
    <DashboardLayout requiredRole="kitchen">
      <KitchenClient initialOrders={orders ?? []} />
    </DashboardLayout>
  );
}
