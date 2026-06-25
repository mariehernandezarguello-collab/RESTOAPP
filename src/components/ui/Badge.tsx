import { OrderStatus, Role } from "@/types";

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "bg-yellow-100 text-yellow-800",
  },
  preparing: {
    label: "Preparando",
    className: "bg-blue-100 text-blue-800",
  },
  ready: {
    label: "Listo",
    className: "bg-green-100 text-green-800",
  },
  delivered: {
    label: "Entregado",
    className: "bg-gray-100 text-gray-800",
  },
  paid: {
    label: "Pagado",
    className: "bg-purple-100 text-purple-800",
  },
};

const roleConfig: Record<Role, { label: string; className: string }> = {
  admin: { label: "Administrador", className: "bg-brand-100 text-brand-800" },
  waiter: { label: "Mesero", className: "bg-blue-100 text-blue-800" },
  kitchen: { label: "Cocina", className: "bg-orange-100 text-orange-800" },
  cashier: { label: "Cajero", className: "bg-green-100 text-green-800" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  const config = roleConfig[role];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
