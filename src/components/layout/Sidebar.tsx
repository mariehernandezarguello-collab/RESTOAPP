"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Receipt,
  BarChart3,
  LogOut,
  TableProperties,
} from "lucide-react";
import { Role } from "@/types";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    {
      href: "/admin/dashboard",
      label: "Inicio",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: "/admin/employees",
      label: "Empleados",
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: "/admin/menu",
      label: "Menú",
      icon: <UtensilsCrossed className="h-5 w-5" />,
    },
    {
      href: "/admin/tables",
      label: "Mesas",
      icon: <TableProperties className="h-5 w-5" />,
    },
    {
      href: "/admin/reports",
      label: "Reportes",
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ],
  waiter: [
    {
      href: "/waiter/orders",
      label: "Pedidos",
      icon: <ClipboardList className="h-5 w-5" />,
    },
  ],
  kitchen: [
    {
      href: "/kitchen/queue",
      label: "Cola de pedidos",
      icon: <ChefHat className="h-5 w-5" />,
    },
  ],
  cashier: [
    {
      href: "/cashier/billing",
      label: "Facturación",
      icon: <Receipt className="h-5 w-5" />,
    },
  ],
};

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  waiter: "Mesero",
  kitchen: "Cocina",
  cashier: "Cajero",
};

const roleColors: Record<Role, string> = {
  admin: "bg-brand-600",
  waiter: "bg-blue-600",
  kitchen: "bg-orange-600",
  cashier: "bg-green-600",
};

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = navByRole[role] ?? [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 min-h-screen bg-gray-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">RestoApp</p>
            <p className="text-gray-400 text-xs">Gestión de restaurante</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full ${roleColors[role]} flex items-center justify-center text-white text-sm font-semibold`}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
            <p className="text-gray-400 text-xs">{roleLabels[role]}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
