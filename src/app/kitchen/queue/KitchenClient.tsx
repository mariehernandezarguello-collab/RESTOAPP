"use client";
import { useState, useEffect } from "react";
import { Order } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { ChefHat, Clock, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  initialOrders: Order[];
}

export function KitchenClient({ initialOrders }: Props) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = supabase.channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (payload) => {
        if (payload.eventType === "INSERT") {
          const { data } = await supabase.from("orders").select("*, table:tables(name), waiter:profiles(full_name), items:order_items(*, menu_item:menu_items(name))").eq("id", payload.new.id).single();
          if (data && ["pending", "preparing"].includes(data.status)) setOrders((prev) => [...prev, data]);
        } else if (payload.eventType === "UPDATE") {
          if (["pending", "preparing"].includes(payload.new.status)) {
            setOrders((prev) => prev.map((o) => o.id === payload.new.id ? { ...o, ...payload.new } : o));
          } else {
            setOrders((prev) => prev.filter((o) => o.id !== payload.new.id));
          }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleUpdateStatus = async (orderId: string, newStatus: "preparing" | "ready") => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (newStatus === "ready") {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const pending = orders.filter((o) => o.status === "pending");
  const preparing = orders.filter((o) => o.status === "preparing");

  const getElapsedColor = (createdAt: string) => {
    const minutes = (now.getTime() - new Date(createdAt).getTime()) / 60000;
    if (minutes > 20) return "border-l-red-500 bg-red-50";
    if (minutes > 10) return "border-l-yellow-500 bg-yellow-50";
    return "border-l-green-500";
  };

  const OrderCard = ({ order }: { order: any }) => (
    <Card className={`border-l-4 ${getElapsedColor(order.created_at)}`}>
      <CardHeader>
        <div><CardTitle>{order.table?.name ?? "Mesa"}</CardTitle><p className="text-xs text-gray-500">{order.waiter?.full_name} · hace {formatDistanceToNow(new Date(order.created_at), { locale: es })}</p></div>
        <Clock className="h-5 w-5 text-gray-400" />
      </CardHeader>
      <div className="space-y-2 mb-4">
        {order.items?.map((item: any) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-700">{item.quantity}</span>
            <span className="text-sm font-medium text-gray-800">{item.menu_item?.name}</span>
          </div>
        ))}
      </div>
      {order.notes && <div className="mb-4 p-2 bg-amber-50 border border-amber-200 rounded-lg"><p className="text-xs text-amber-800">⚠️ {order.notes}</p></div>}
      <div className="pt-3 border-t border-gray-100">
        {order.status === "pending" ? (
          <Button className="w-full" variant="secondary" onClick={() => handleUpdateStatus(order.id, "preparing")}><ChefHat className="h-4 w-4" />Iniciar preparación</Button>
        ) : (
          <Button className="w-full" variant="success" onClick={() => handleUpdateStatus(order.id, "ready")}><CheckCircle className="h-4 w-4" />¡Listo para servir!</Button>
        )}
      </div>
    </Card>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Cola de cocina</h1><p className="text-gray-500 mt-1">{pending.length} esperando · {preparing.length} en preparación</p></div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Menos de 10 min</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> 10–20 min</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Más de 20 min</span>
        </div>
      </div>
      {orders.length === 0 ? (
        <Card><div className="text-center py-16 text-gray-400"><ChefHat className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-lg">No hay pedidos en espera</p><p className="text-sm mt-1">Los nuevos pedidos aparecerán aquí automáticamente</p></div></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Esperando ({pending.length})</h2>
            <div className="space-y-4">{pending.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin pedidos pendientes</p> : pending.map((order) => <OrderCard key={order.id} order={order} />)}</div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />En preparación ({preparing.length})</h2>
            <div className="space-y-4">{preparing.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Nada en preparación</p> : preparing.map((order) => <OrderCard key={order.id} order={order} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
