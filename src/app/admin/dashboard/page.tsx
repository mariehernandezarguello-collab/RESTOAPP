import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalEmployees },
    { count: activeOrders },
    { data: todayPayments },
    { data: recentOrders },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "preparing", "ready"]),
    supabase
      .from("payments")
      .select("total_amount")
      .gte("created_at", `${today}T00:00:00`)
      .lte("created_at", `${today}T23:59:59`),
    supabase
      .from("orders")
      .select("*, table:tables(name), waiter:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const todaySales =
    todayPayments?.reduce((sum, p) => sum + p.total_amount, 0) ?? 0;

  const stats = [
    {
      label: "Empleados activos",
      value: totalEmployees ?? 0,
      icon: <Users className="h-6 w-6" />,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Pedidos activos",
      value: activeOrders ?? 0,
      icon: <ShoppingBag className="h-6 w-6" />,
      color: "text-orange-600 bg-orange-50",
    },
    {
      label: "Ventas de hoy",
      value: `$${todaySales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      icon: <DollarSign className="h-6 w-6" />,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Transacciones hoy",
      value: todayPayments?.length ?? 0,
      icon: <TrendingUp className="h-6 w-6" />,
      color: "text-purple-600 bg-purple-50",
    },
  ];

  const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    preparing: "Preparando",
    ready: "Listo",
    delivered: "Entregado",
    paid: "Pagado",
  };

  const statusColors: Record<string, string> = {
    pending: "text-yellow-700 bg-yellow-50",
    preparing: "text-blue-700 bg-blue-50",
    ready: "text-green-700 bg-green-50",
    delivered: "text-gray-700 bg-gray-50",
    paid: "text-purple-700 bg-purple-50",
  };

  return (
    <DashboardLayout requiredRole="admin">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de control
          </h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos recientes</CardTitle>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              Últimos 5
            </div>
          </CardHeader>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">
                      Mesa
                    </th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">
                      Mesero
                    </th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">
                      Estado
                    </th>
                    <th className="text-left py-2 text-gray-500 font-medium">
                      Hora
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: any) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {order.table?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {order.waiter?.full_name ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {format(new Date(order.created_at), "HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ShoppingBag className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No hay pedidos todavía</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
