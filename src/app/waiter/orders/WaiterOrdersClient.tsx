"use client";
import { useState, useEffect } from "react";
import { RestaurantTable, MenuItem, Order } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { Plus, ShoppingCart, Trash2, ChefHat, TableProperties } from "lucide-react";
import { format } from "date-fns";

interface Props {
  tables: RestaurantTable[];
  menuItems: MenuItem[];
  initialOrders: Order[];
  waiterId: string;
}

interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  notes: string;
}

export function WaiterOrdersClient({ tables, menuItems, initialOrders, waiterId }: Props) {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [newOrderModal, setNewOrderModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [orderNotes, setOrderNotes] = useState("");

  const categories = ["all", ...Array.from(new Set(menuItems.map((i) => i.category)))];

  useEffect(() => {
    const channel = supabase.channel("waiter-orders")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item.id === item.id);
      if (existing) return prev.map((c) => c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menu_item: item, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.menu_item.id === itemId ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menu_item.price * c.quantity, 0);

  const handleCreateOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setLoading(true);
    const { data: order, error } = await supabase.from("orders").insert({ table_id: selectedTable, waiter_id: waiterId, status: "pending", notes: orderNotes || null }).select().single();
    if (error || !order) { setLoading(false); return; }
    const items = cart.map((c) => ({ order_id: order.id, menu_item_id: c.menu_item.id, quantity: c.quantity, unit_price: c.menu_item.price, notes: c.notes || null }));
    await supabase.from("order_items").insert(items);
    const { data: fullOrder } = await supabase.from("orders").select("*, table:tables(name), items:order_items(*, menu_item:menu_items(name, price))").eq("id", order.id).single();
    if (fullOrder) setOrders((prev) => [fullOrder, ...prev]);
    setNewOrderModal(false);
    setCart([]);
    setSelectedTable("");
    setOrderNotes("");
    setLoading(false);
  };

  const handleMarkDelivered = async (orderId: string) => {
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "delivered" } : o));
  };

  const statusBg: Record<string, string> = {
    pending: "border-l-yellow-400",
    preparing: "border-l-blue-400",
    ready: "border-l-green-400",
    delivered: "border-l-gray-300",
  };

  const filteredMenu = filterCategory === "all" ? menuItems : menuItems.filter((i) => i.category === filterCategory);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis pedidos</h1>
          <p className="text-gray-500 mt-1">{orders.filter((o) => o.status !== "delivered").length} pedidos activos</p>
        </div>
        <Button onClick={() => setNewOrderModal(true)}><Plus className="h-4 w-4" />Nuevo pedido</Button>
      </div>

      {orders.length === 0 ? (
        <Card><div className="text-center py-12 text-gray-400"><ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No tienes pedidos activos.</p><Button className="mt-4" onClick={() => setNewOrderModal(true)}>Crear primer pedido</Button></div></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order: any) => (
            <Card key={order.id} className={`border-l-4 ${statusBg[order.status] ?? "border-l-gray-300"}`}>
              <CardHeader>
                <div><CardTitle>{order.table?.name ?? "Mesa"}</CardTitle><p className="text-xs text-gray-500">{format(new Date(order.created_at), "HH:mm")}</p></div>
                <StatusBadge status={order.status} />
              </CardHeader>
              <div className="space-y-1 mb-4">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700"><span className="font-medium">{item.quantity}x</span> {item.menu_item?.name}</span>
                    <span className="text-gray-500">${(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {order.notes && <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3">📝 {order.notes}</p>}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="font-bold text-gray-900">${order.items?.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0).toFixed(2)}</span>
                {order.status === "ready" && <Button size="sm" variant="success" onClick={() => handleMarkDelivered(order.id)}>✓ Entregar</Button>}
                {order.status === "preparing" && <span className="flex items-center gap-1 text-xs text-blue-600"><ChefHat className="h-4 w-4" /> En cocina...</span>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={newOrderModal} onClose={() => { setNewOrderModal(false); setCart([]); }} title="Nuevo pedido" size="lg">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Seleccionar mesa</p>
            <div className="grid grid-cols-3 gap-2">
              {tables.map((table) => (
                <button key={table.id} onClick={() => setSelectedTable(table.id)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    selectedTable === table.id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}>
                  <TableProperties className="h-4 w-4 mx-auto mb-1" />{table.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filterCategory === cat ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
                }`}>
                {cat === "all" ? "Todo" : cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {filteredMenu.map((item) => {
              const inCart = cart.find((c) => c.menu_item.id === item.id);
              return (
                <button key={item.id} onClick={() => addToCart(item)}
                  className="text-left p-3 rounded-lg border border-gray-200 hover:border-brand-400 hover:bg-brand-50 transition-colors relative">
                  {inCart && <span className="absolute top-2 right-2 w-5 h-5 bg-brand-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{inCart.quantity}</span>}
                  <p className="text-sm font-medium text-gray-900 pr-6">{item.name}</p>
                  <p className="text-sm text-brand-600 font-bold">${item.price.toFixed(2)}</p>
                </button>
              );
            })}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Pedido actual</p>
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.menu_item.id} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                      <button onClick={() => updateQuantity(c.menu_item.id, -1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-l-lg">−</button>
                      <span className="text-sm font-medium w-6 text-center">{c.quantity}</span>
                      <button onClick={() => updateQuantity(c.menu_item.id, 1)} className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-r-lg">+</button>
                    </div>
                    <span className="text-sm flex-1">{c.menu_item.name}</span>
                    <span className="text-sm font-medium text-gray-700">${(c.menu_item.price * c.quantity).toFixed(2)}</span>
                    <button onClick={() => setCart((prev) => prev.filter((i) => i.menu_item.id !== c.menu_item.id))}><Trash2 className="h-4 w-4 text-red-400" /></button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 mt-3">
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Notas especiales (alergias, preferencias...)" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total: ${cartTotal.toFixed(2)}</span>
                  <Button onClick={handleCreateOrder} disabled={!selectedTable} loading={loading}><ChefHat className="h-4 w-4" />Enviar a cocina</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
