import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WaiterOrdersClient } from "./WaiterOrdersClient";
import { createClient } from "@/lib/supabase/server";

export default async function WaiterOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: tables }, { data: menuItems }, { data: activeOrders }] = await Promise.all([
    supabase.from("tables").select("*").eq("is_active", true).order("position"),
    supabase.from("menu_items").select("*").eq("is_available", true).order("category").order("name"),
    supabase.from("orders").select("*, table:tables(name), items:order_items(*, menu_item:menu_items(name, price))").eq("waiter_id", user!.id).in("status", ["pending", "preparing", "ready", "delivered"]).order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardLayout requiredRole="waiter">
      <WaiterOrdersClient tables={tables ?? []} menuItems={menuItems ?? []} initialOrders={activeOrders ?? []} waiterId={user!.id} />
    </DashboardLayout>
  );
}
