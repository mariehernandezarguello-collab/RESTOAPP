export type Role = "admin" | "waiter" | "kitchen" | "cashier";

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "delivered"
  | "paid";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  is_active: boolean;
  position: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
}

export interface Order {
  id: string;
  table_id: string;
  waiter_id: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  table?: RestaurantTable;
  waiter?: Profile;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  menu_item?: MenuItem;
}

export interface Payment {
  id: string;
  order_id: string;
  cashier_id: string;
  total_amount: number;
  payment_method: "cash" | "card" | "transfer";
  created_at: string;
  order?: Order;
}
