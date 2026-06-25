"use client";
import { useState } from "react";
import { Profile, Role } from "@/types";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { RoleBadge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, UserCheck, UserX } from "lucide-react";

interface Props {
  initialEmployees: Profile[];
}

const roleOptions = [
  { value: "waiter", label: "Mesero" },
  { value: "kitchen", label: "Cocina / Chef" },
  { value: "cashier", label: "Cajero" },
  { value: "admin", label: "Administrador" },
];

export function EmployeesClient({ initialEmployees }: Props) {
  const supabase = createClient();
  const [employees, setEmployees] = useState<Profile[]>(initialEmployees);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Profile | null>(null);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "waiter" as Role,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ full_name: "", email: "", password: "", role: "waiter" });
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (emp: Profile) => {
    setEditing(emp);
    setForm({
      full_name: emp.full_name,
      email: emp.email,
      password: "",
      role: emp.role,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (editing) {
      const updates: Partial<Profile> = {
        full_name: form.full_name,
        role: form.role,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", editing.id);

      if (error) {
        setError("Error al actualizar: " + error.message);
        setLoading(false);
        return;
      }

      setEmployees((prev) =>
        prev.map((e) => (e.id === editing.id ? { ...e, ...updates } : e))
      );
    } else {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al crear el empleado");
        setLoading(false);
        return;
      }

      setEmployees((prev) => [data.profile, ...prev]);
    }

    setModalOpen(false);
    setLoading(false);
  };

  const handleToggleActive = async (emp: Profile) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !emp.is_active })
      .eq("id", emp.id);

    if (!error) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id ? { ...e, is_active: !emp.is_active } : e
        )
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setLoading(true);

    const res = await fetch(`/api/admin/employees/${deleteModal.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== deleteModal.id));
    }

    setDeleteModal(null);
    setLoading(false);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-500 mt-1">
            Gestiona el equipo de tu restaurante
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nombre</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Rol</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Estado</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    No hay empleados registrados. Crea el primero.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.full_name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.email}</td>
                    <td className="px-6 py-4"><RoleBadge role={emp.role} /></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        emp.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                        {emp.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleToggleActive(emp)}>
                          {emp.is_active ? <UserX className="h-4 w-4 text-gray-500" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteModal(emp)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar empleado" : "Nuevo empleado"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <Input label="Nombre completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ej: María García" required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="empleado@restaurante.com" required disabled={!!editing} hint={editing ? "El email no se puede cambiar" : undefined} />
          {!editing && (
            <Input label="Contraseña inicial" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" required minLength={8} hint="El empleado podrá cambiarla después" />
          )}
          <Select label="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} options={roleOptions} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editing ? "Guardar cambios" : "Crear empleado"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Eliminar empleado" size="sm">
        <p className="text-gray-600 mb-6">¿Estás seguro que deseas eliminar a <strong>{deleteModal?.full_name}</strong>? Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal(null)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={loading} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
