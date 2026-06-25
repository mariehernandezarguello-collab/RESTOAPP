import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DollarSign, ShoppingBag, TrendingUp, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";

export default async function ReportsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const last7 = subDays(new Date(), 6).toISOString().split("T")[0];

  const [{ data: payments7 }, { data: ordersByTable }, { data: hourlyOrders }] = await Promise.all([
    supabase.from("payments").select("total_amount, payment_method, created_at").gte("created_at", `${last7}T00:00:00`).order("created_at"),
    supabase.from("orders").select("table:tables(name), status").gte("created_at", `${today}T00:00:00`).eq("status", "paid"),
    supabase.from("orders").select("created_at").gte("created_at", `${today}T00:00:00`),
  ]);

  const salesByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    salesByDay[d] = 0;
  }
  payments7?.forEach((p) => {
    const d = p.created_at.split("T")[0];
    if (salesByDay[d] !== undefined) salesByDay[d] += p.total_amount;
  });

  const totalWeek = payments7?.reduce((s, p) => s + p.total_amount, 0) ?? 0;
  const todaySales = payments7?.filter((p) => p.created_at.startsWith(today)).reduce((s, p) => s + p.total_amount, 0) ?? 0;

  const tableCount: Record<string, number> = {};
  ordersByTable?.forEach((o: any) => {
    const name = o.table?.name ?? "Sin mesa";
    tableCount[name] = (tableCount[name] ?? 0) + 1;
  });

  const hourCount: Record<number, number> = {};
  hourlyOrders?.forEach((o) => {
    const h = new Date(o.created_at).getHours();
    hourCount[h] = (hourCount[h] ?? 0) + 1;
  });
  const peakHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0];

  const byMethod: Record<string, number> = {};
  payments7?.filter((p) => p.created_at.startsWith(today)).forEach((p) => {
    byMethod[p.payment_method] = (byMethod[p.payment_method] ?? 0) + p.total_amount;
  });

  const methodLabels: Record<string, string> = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
  const maxSale = Math.max(...Object.values(salesByDay), 1);

  return (
    <DashboardLayout requiredRole="admin">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 mt-1">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Ventas hoy", value: `$${todaySales.toFixed(2)}`, icon: <DollarSign className="h-6 w-6" />, color: "text-green-600 bg-green-50" },
            { label: "Ventas (7 días)", value: `$${totalWeek.toFixed(2)}`, icon: <TrendingUp className="h-6 w-6" />, color: "text-blue-600 bg-blue-50" },
            { label: "Pedidos hoy", value: ordersByTable?.length ?? 0, icon: <ShoppingBag className="h-6 w-6" />, color: "text-orange-600 bg-orange-50" },
            { label: "Hora pico", value: peakHour ? `${peakHour[0]}:00 (${peakHour[1]} pedidos)` : "—", icon: <Clock className="h-6 w-6" />, color: "text-purple-600 bg-purple-50" },
          ].map((s) => (
            <Card key={s.label}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${s.color}`}>{s.icon}</div>
                <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold text-gray-900">{s.value}</p></div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader><CardTitle>Ventas últimos 7 días</CardTitle></CardHeader>
            <div className="space-y-3">
              {Object.entries(salesByDay).map(([date, amount]) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{format(new Date(date + "T12:00:00"), "EEE d/MM", { locale: es })}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(amount / maxSale) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-20 text-right">${amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pedidos por mesa (hoy)</CardTitle></CardHeader>
            {Object.keys(tableCount).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin pedidos hoy</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(tableCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{name}</span>
                    <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{count} {count === 1 ? "pedido" : "pedidos"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Métodos de pago (hoy)</CardTitle></CardHeader>
            {Object.keys(byMethod).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin transacciones hoy</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{methodLabels[method] ?? method}</span>
                    <span className="font-semibold text-green-600">${amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle>Actividad por hora (hoy)</CardTitle></CardHeader>
            {Object.keys(hourCount).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin actividad hoy</p>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: 24 }, (_, h) => ({ h, count: hourCount[h] ?? 0 })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 8).map(({ h, count }) => {
                  const maxH = Math.max(...Object.values(hourCount));
                  return (
                    <div key={h} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 shrink-0">{h}:00</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(count / maxH) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
