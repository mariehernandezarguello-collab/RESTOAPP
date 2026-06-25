-- ============================================================
-- RESTOAPP — Script de configuración de base de datos
-- Instrucciones: Copia TODO este contenido y pégalo en
-- Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. TABLA DE PERFILES DE EMPLEADOS
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'waiter', 'kitchen', 'cashier')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. TABLA DE MESAS
create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null default 4,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. TABLA DE MENÚ
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  category text not null,
  is_available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

-- 4. TABLA DE PEDIDOS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.tables(id),
  waiter_id uuid references public.profiles(id),
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'delivered', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. TABLA DE ITEMS DE PEDIDO
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  notes text,
  created_at timestamptz not null default now()
);

-- 6. TABLA DE PAGOS
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  cashier_id uuid references public.profiles(id),
  total_amount numeric(10,2) not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEGURIDAD: Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

create policy "profiles_read" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "tables_read" on public.tables
  for select to authenticated using (true);

create policy "tables_admin_write" on public.tables
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "menu_read" on public.menu_items
  for select to authenticated using (true);

create policy "menu_admin_write" on public.menu_items
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "orders_read" on public.orders
  for select to authenticated using (true);

create policy "orders_waiter_insert" on public.orders
  for insert to authenticated
  with check (waiter_id = auth.uid());

create policy "orders_update_status" on public.orders
  for update to authenticated
  using (true);

create policy "order_items_read" on public.order_items
  for select to authenticated using (true);

create policy "order_items_insert" on public.order_items
  for insert to authenticated with check (true);

create policy "payments_read" on public.payments
  for select to authenticated using (true);

create policy "payments_insert" on public.payments
  for insert to authenticated
  with check (cashier_id = auth.uid());

-- ============================================================
-- TIEMPO REAL
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

-- ============================================================
-- FUNCIÓN: Crear perfil automáticamente al registrar usuario
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'waiter')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DATOS DE PRUEBA (opcional, descomenta para usarlos)
-- ============================================================
/*
insert into public.menu_items (name, description, price, category) values
  ('Sopa del día', 'Sopa casera según temporada', 85.00, 'Sopas'),
  ('Ensalada César', 'Lechuga romana, crutones, queso parmesano', 120.00, 'Ensaladas'),
  ('Pollo a la plancha', 'Pechuga de pollo con guarnición', 185.00, 'Platos fuertes'),
  ('Filete de res', 'Con papas a la francesa y ensalada', 280.00, 'Platos fuertes'),
  ('Pasta Alfredo', 'Fettuccine con salsa cremosa de queso', 155.00, 'Pastas'),
  ('Agua natural', '600ml', 30.00, 'Bebidas'),
  ('Refresco', 'Lata 355ml', 45.00, 'Bebidas'),
  ('Pastel de chocolate', 'Con helado de vainilla', 95.00, 'Postres');
*/
