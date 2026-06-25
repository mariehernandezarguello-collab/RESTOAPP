"use client";
import { useState } from "react";
import { MenuItem } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, UtensilsCrossed } from "lucide-react";

interface Props {
  initialItems: MenuItem[];
}

const CATEGORIES = [
  "Entradas",
  "Sopas",
  "Platos fuertes",
  "Pastas",
  "Pizzas",
  "Ensaladas",
  "Postres",
  "Bebidas",
  "Bebidas alcohólicas",
  "Extras",
];

export function MenuClient({ initialItems }: Props) {
  const supabase = createClient();
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<MenuItem | null>(null);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: CATEGORIES[0],
    is_available: true,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "", price: "", category: CATEGORIES[0], is_available: true });
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      category: item.category,
      is_available: item.is_available,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category,
      is_available: form.is_available,
    };

    if (editing) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editing.id);
      if (!error) setItems((prev) => prev.map((i) => i.id === editing.id ? { ...i, ...payload } : i));
    } else {
      const { data, error } = await supabase.from("menu_items").insert(payload).select().single();
      if (!error && data) setItems((prev) => [...prev, data]);
    }

    setModalOpen(false);
    setLoading(false);
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    if (!error) setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !item.is_available } : i));
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setLoading(true);
    await supabase.from("menu_items").delete().eq("id", deleteModal.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteModal.id));
    setDeleteModal(null);
    setLoading(false);
  };

  const categories = ["all", ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = filterCategory === "all" ? items : items.filter((i) => i.category === filterCategory);
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menú</h1>
          <p className="text-gray-500 mt-1">{items.length} platos registrados</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" />Agregar plato</Button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat ? "bg-brand-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>
            {cat === "all" ? "Todos" : cat}
          </button>
        ))}
      </div>

      {Object.entries(grouped).length === 0 ? (
        <Card><div className="text-center py-12 text-gray-400"><UtensilsCrossed className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No hay platos en el menú. Agrega el primero.</p></div></Card>
      ) : (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryItems.map((item) => (
                <Card key={item.id} className={`${!item.is_available ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                      {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                      <p className="text-lg font-bold text-brand-600 mt-2">${item.price.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => handleToggleAvailable(item)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                        item.is_available ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                      {item.is_available ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      {item.is_available ? "Disponible" : "No disponible"}
                    </button>
                    <div className="ml-auto flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-4 w-4 text-gray-500" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteModal(item)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar plato" : "Nuevo plato"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre del plato" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Pollo a la plancha" required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripción (opcional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ingredientes o descripción del plato..." rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Input label="Precio" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoría</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="w-4 h-4 text-brand-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Disponible en el menú</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editing ? "Guardar cambios" : "Agregar plato"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Eliminar plato" size="sm">
        <p className="text-gray-600 mb-6">¿Eliminar <strong>{deleteModal?.name}</strong>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
