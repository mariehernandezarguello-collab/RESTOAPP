"use client";
import { useState, useEffect } from "react";
import { Order, Payment } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Receipt, DollarSign, CreditCard, Smartphone, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  initialOrders: Order[];
  todayPayments: Payment[];
  cashierId: string;
}

export function CashierClient({ initialOrders, todayPayments: initialPayments, cashierId }: Props) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [paymentModal, setPaymentModal] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const channel = supabase.channel("cashier-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, async (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === "ready" || newStatus === "delivered") {
          const { data } = await supabase.from("orders").select("*, table:tables(name), waiter:profiles(full_name), items:order_items(*, menu_item:menu_items(name, price))").eq("id", payload.new.id).single();
          if (data) setOrders((prev) => { const exists = prev.find((o) => o.id === data.id); if (exists) return prev.map((o) => o.id === data.id ? data : o); return [...prev, data]; });
        } else if (newStatus === "paid") {
          setOrders((prev) => prev.filter((o) => o.id !== payload.new.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const getTotal = (order: any) => order.items?.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0) ?? 0;

  const handleProcessPayment = async () => {
    if (!paymentModal) return;
    setLoading(true);
    const total = getTotal(paymentModal);
    const { data: payment } = await supabase.from("payments").insert({ order_id: paymentModal.id, cashier_id: cashierId, total_amount: total, payment_method: paymentMethod }).select().single();
    await supabase.from("orders").update({ status: "paid" }).eq("id", paymentModal.id);
    if (payment) setPayments((prev) => [payment, ...prev]);
    setOrders((prev) => prev.filter((o) => o.id !== paymentModal.id));
    setPaymentModal(null);
    setLoading(false);
  };

  const todayTotal = payments.reduce((s, p) => s + p.total_amount, 0);
  const paymentMethodConfig = {
    cash: { label: "Efectivo", icon: <DollarSign className="h-5 w-5" /> },
    card: { label: "Tarjeta", icon: <CreditCard className="h-5 w-5" /> },
    transfer: { label: "Transferencia", icon: <Smartphone className="h-5 w-5" /> },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <p className="text-gray-500 mt-1">{orders.length} pedidos por cobrar · {format(new Date(), "d/MM/yyyy")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card><p className="text-sm text-gray-500">Ventas del día</p><p className="text-2xl font-bold text-green-600 mt-1">${todayTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p></Card>
        <Card><p className="text-sm text-gray-500">Transacciones</p><p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p></Card>
        <Card><p className="text-sm text-gray-500">Por cobrar</p><p className="text-2xl font-bold text-orange-600 mt-1">{orders.length}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cuentas pendientes</h2>
          {orders.length === 0 ? (
            <Card><div className="text-center py-8 text-gray-400"><CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>Todo cobrado 🎉</p></div></Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order: any) => (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardHeader><CardTitle>{order.table?.name}</CardTitle><span className="text-sm text-gray-500">{format(new Date(order.created_at), "HH:mm")}</span></CardHeader>
                  <div className="space-y-1 mb-4">{order.items?.map((item: any) => (<div key={item.id} className="flex justify-between text-sm text-gray-600"><span>{item.quantity}x {item.menu_item?.name}</span><span>${(item.unit_price * item.quantity).toFixed(2)}</span></div>))}</div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-lg font-bold text-gray-900">Total: ${getTotal(order).toFixed(2)}</span>
                    <Button onClick={() => { setPaymentModal(order); setPaymentMethod("cash"); }}><Receipt className="h-4 w-4" />Cobrar</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Transacciones del día</h2>
          {payments.length === 0 ? (
            <Card><p className="text-center py-8 text-gray-400 text-sm">Sin transacciones hoy</p></Card>
          ) : (
            <Card padding="none">
              <div className="overflow-hidden">
                {payments.map((payment: any, i) => (
                  <div key={payment.id} className={`flex items-center justify-between px-5 py-3 ${i !== payments.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <div><p className="text-sm font-medium text-gray-900">{payment.order?.table?.name ?? "Mesa"}</p><p className="text-xs text-gray-500">{paymentMethodConfig[payment.payment_method as keyof typeof paymentMethodConfig]?.label} · {format(new Date(payment.created_at), "HH:mm")}</p></div>
                    <p className="font-semibold text-green-600">${payment.total_amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Procesar pago" size="sm">
        {paymentModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900 mb-2">{(paymentModal as any).table?.name}</p>
              <div className="space-y-1">{(paymentModal as any).items?.map((item: any) => (<div key={item.id} className="flex justify-between text-sm text-gray-600"><span>{item.quantity}x {item.menu_item?.name}</span><span>${(item.unit_price * item.quantity).toFixed(2)}</span></div>))}</div>
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold text-lg"><span>Total</span><span className="text-green-600">${getTotal(paymentModal).toFixed(2)}</span></div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(paymentMethodConfig) as [typeof paymentMethod, typeof paymentMethodConfig[typeof paymentMethod]][]).map(([method, config]) => (
                  <button key={method} onClick={() => setPaymentMethod(method)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${
                      paymentMethod === method ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600"
                    }`}>
                    {config.icon}<span className="text-xs font-medium">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPaymentModal(null)}>Cancelar</Button>
              <Button className="flex-1" loading={loading} onClick={handleProcessPayment}><CheckCircle className="h-4 w-4" />Confirmar pago</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
