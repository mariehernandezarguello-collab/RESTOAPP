import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CashierClient } from "./CashierClient";
import { createClient } from "@/lib/supabase/server";

export default async function CashierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date().toISOString().split("T")[0];

  const [{ data: readyOrders }, { data: todayPayments }] = await Promise.all([
    supabase.from("orders").select("*, table:tables(name), waiter:profiles(full_name), items:order_items(*, menu_item:menu_items(name, price))").in("status", ["ready", "delivered"]).order("created_at"),
    supabase.from("payments").select("*, order:orders(*, table:tables(name))").gte("created_at", `${today}T00:00:00`).order("created_at", { ascending: false }),
  ]);

  return (
    <DashboardLayout requiredRole="cashier">
      <CashierClient initialOrders={readyOrders ?? []} todayPayments={todayPayments ?? []} cashierId={user!.id} />
    </DashboardLayout>
  );
}
