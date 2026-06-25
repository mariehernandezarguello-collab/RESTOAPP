"use client";
import { useState } from "react";
import { RestaurantTable } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, TableProperties, Users } from "lucide-react";

interface Props {
  initialTables: RestaurantTable[];
}

export function TablesClient({ initialTables }: Props) {
  const supabase = createClient();
  const [tables, setTables] = useState<RestaurantTable[]>(initialTables);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<RestaurantTable | null>(null);
  const [editing, setEditing] = useState<RestaurantTable | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", capacity: "4" });
  const [bulkCount, setBulkCount] = useState("5");
  const [bulkPrefix, setBulkPrefix] = useState("Mesa");
  const [bulkStart, setBulkStart] = useState("1");
  const [bulkCapacity, setBulkCapacity] = useState("4");

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", capacity: "4" });
    setModalOpen(true);
  };

  const openEdit = (table: RestaurantTable) => {
    setEditing(table);
    setForm({ name: table.name, capacity: String(table.capacity) });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { name: form.name, capacity: parseInt(form.capacity) };
    if (editing) {
      const { error } = await supabase.from("tables").update(payload).eq("id", editing.id);
      if (!error) setTables((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...payload } : t));
    } else {
      const position = tables.length + 1;
      const { data, error } = await supabase.from("tables").insert({ ...payload, is_active: true, position }).select().single();
      if (!error && data) setTables((prev) => [...prev, data]);
    }
    setModalOpen(false);
    setLoading(false);
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const count = parseInt(bulkCount);
    const start = parseInt(bulkStart);
    const capacity = parseInt(bulkCapacity);
    const currentCount = tables.length;
    const newTables = Array.from({ length: count }, (_, i) => ({
      name: `${bulkPrefix} ${start + i}`,
      capacity,
      is_active: true,
      position: currentCount + i + 1,
    }));
    const { data, error } = await supabase.from("tables").insert(newTables).select();
    if (!error && data) setTables((prev) => [...prev, ...data]);
    setBulkModal(false);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setLoading(true);
    await supabase.from("tables").delete().eq("id", deleteModal.id);
    setTables((prev) => prev.filter((t) => t.id !== deleteModal.id));
    setDeleteModal(null);
    setLoading(false);
  };

  const handleToggleActive = async (table: RestaurantTable) => {
    const { error } = await supabase.from("tables").update({ is_active: !table.is_active }).eq("id", table.id);
    if (!error) setTables((prev) => prev.map((t) => t.id === table.id ? { ...t, is_active: !table.is_active } : t));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-gray-500 mt-1">{tables.length} mesas · {tables.filter((t) => t.is_active).length} activas</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setBulkModal(true)}><Plus className="h-4 w-4" />Agregar varias</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" />Nueva mesa</Button>
        </div>
      </div>

      {tables.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-400">
            <TableProperties className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="mb-4">No hay mesas configuradas.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setBulkModal(true)}>Agregar varias a la vez</Button>
              <Button onClick={openCreate}>Agregar primera mesa</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => (
            <Card key={table.id} padding="sm" className={`${!table.is_active ? "opacity-50" : ""} hover:shadow-md transition-shadow`}>
              <div className="text-center mb-3">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${table.is_active ? "bg-brand-50" : "bg-gray-100"}`}>
                  <TableProperties className={`h-6 w-6 ${table.is_active ? "text-brand-600" : "text-gray-400"}`} />
                </div>
                <p className="font-semibold text-gray-900">{table.name}</p>
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1 mt-1"><Users className="h-3 w-3" />{table.capacity} personas</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleToggleActive(table)}
                  className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${
                    table.is_active ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {table.is_active ? "Activa" : "Inactiva"}
                </button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(table)}><Pencil className="h-3.5 w-3.5 text-gray-500" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteModal(table)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Editar ${editing.name}` : "Nueva mesa"} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre de la mesa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Mesa 1, Terraza A, VIP..." required hint="Puede ser un número, nombre especial o zona" />
          <Input label="Capacidad (personas)" type="number" min="1" max="50" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editing ? "Guardar cambios" : "Crear mesa"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Agregar varias mesas a la vez">
        <form onSubmit={handleBulkCreate} className="space-y-4">
          <p className="text-sm text-gray-500">Crea múltiples mesas con numeración automática. Por ejemplo: &ldquo;Mesa 1&rdquo;, &ldquo;Mesa 2&rdquo;...</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prefijo del nombre" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="Mesa" required />
            <Input label="Número inicial" type="number" min="1" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="¿Cuántas mesas?" type="number" min="1" max="50" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} required />
            <Input label="Capacidad por mesa" type="number" min="1" max="20" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} required />
          </div>
          <div className="p-3 bg-brand-50 rounded-lg text-sm text-brand-700">
            Se crearán: <strong>{bulkPrefix} {bulkStart}</strong>, <strong>{bulkPrefix} {parseInt(bulkStart) + 1}</strong>... hasta <strong>{bulkPrefix} {parseInt(bulkStart) + parseInt(bulkCount) - 1}</strong>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setBulkModal(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>Crear {bulkCount} mesas</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Eliminar mesa" size="sm">
        <p className="text-gray-600 mb-6">¿Eliminar <strong>{deleteModal?.name}</strong>? Si tiene pedidos activos, primero ciérralos.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
