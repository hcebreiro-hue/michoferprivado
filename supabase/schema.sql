-- =====================================================================
--  Mi chofer privado Viajes · Esquema de base de datos para Supabase
--  Ejecuta este archivo en el SQL Editor de tu proyecto Supabase.
--  (Supabase → SQL Editor → New query → pega y Run)
-- =====================================================================

-- ---------- Tabla: trips (viajes) ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null default '',
  origin text not null default '',
  destination text not null,
  scheduled_at timestamptz not null,
  blocked_until timestamptz,
  price numeric not null default 0,
  distance_km numeric,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists trips_scheduled_at_idx
  on public.trips (scheduled_at);

-- ---------- Tabla: fuel_logs (cargas de combustible) ----------
create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  filled_at timestamptz not null,
  odometer_km numeric not null default 0,
  liters numeric not null default 0,
  cost_per_liter numeric not null default 0,
  total_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists fuel_logs_filled_at_idx
  on public.fuel_logs (filled_at);

-- ---------- Tabla: maintenance_logs (mantenimientos) ----------
create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('oil', 'brake_pads')),
  performed_at date not null,
  odometer_km numeric not null default 0,
  cost numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_logs_performed_at_idx
  on public.maintenance_logs (performed_at);

-- ---------- Tabla: fixed_costs (gastos fijos mensuales) ----------
create table if not exists public.fixed_costs (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('insurance', 'patent', 'garage', 'phone', 'other')),
  label text not null default '',
  amount numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists fixed_costs_created_at_idx
  on public.fixed_costs (created_at);

-- ---------- Datos por propietario autenticado ----------
create table if not exists public.driver_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade
    default auth.uid(),
  driver_slug text not null unique,
  driver_name text not null default 'Conductor',
  driver_phone text not null default '',
  profile_complete boolean not null default false,
  cost_per_km numeric not null default 120,
  currency text not null default 'ARS',
  current_odometer_km numeric not null default 0,
  oil_change_interval_km numeric not null default 10000,
  last_oil_change_km numeric not null default 0,
  brake_interval_km numeric not null default 30000,
  last_brake_change_km numeric not null default 0,
  wear_cost_per_km numeric not null default 20,
  vtv_expiry date,
  license_expiry date,
  insurance_expiry date,
  tipo_cuenta text not null default 'VIP_GRATIS'
    check (tipo_cuenta in ('VIP_GRATIS', 'VIP_PAGO'))
);

alter table public.driver_settings
  add column if not exists profile_complete boolean not null default false;

create or replace function public.prevent_driver_identity_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.profile_complete and (
    not new.profile_complete
    or new.driver_name is distinct from old.driver_name
    or new.driver_phone is distinct from old.driver_phone
    or new.driver_slug is distinct from old.driver_slug
  ) then
    raise exception 'El nombre, teléfono y enlace del chofer no se pueden cambiar después del alta.';
  end if;
  return new;
end;
$$;

drop trigger if exists driver_settings_identity_immutable
  on public.driver_settings;
create trigger driver_settings_identity_immutable
  before update on public.driver_settings
  for each row execute function public.prevent_driver_identity_changes();

alter table public.trips
  add column if not exists owner_id uuid references auth.users (id) on delete cascade
  default auth.uid();
alter table public.fuel_logs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade
  default auth.uid();
alter table public.maintenance_logs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade
  default auth.uid();
alter table public.fixed_costs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade
  default auth.uid();

create index if not exists trips_owner_scheduled_idx
  on public.trips (owner_id, scheduled_at);
create index if not exists fuel_logs_owner_filled_idx
  on public.fuel_logs (owner_id, filled_at);
create index if not exists maintenance_logs_owner_performed_idx
  on public.maintenance_logs (owner_id, performed_at);
create index if not exists fixed_costs_owner_created_idx
  on public.fixed_costs (owner_id, created_at);

-- ---------- Tabla: saved_addresses (direcciones frecuentes del pasajero) ----------
-- Nota: en la app actual estas direcciones viven en el dispositivo del pasajero.
-- Esta tabla queda disponible por si más adelante se sincronizan por cuenta.
create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  address text not null,
  created_at timestamptz not null default now()
);
alter table public.saved_addresses
  add column if not exists owner_id uuid references auth.users (id) on delete cascade
  default auth.uid();

-- ---------- Tabla: settings (ajustes, una sola fila) ----------
create table if not exists public.settings (
  id int primary key default 1,
  cost_per_km numeric not null default 120,
  currency text not null default 'ARS',
  current_odometer_km numeric not null default 0,
  oil_change_interval_km numeric not null default 10000,
  last_oil_change_km numeric not null default 0,
  brake_interval_km numeric not null default 30000,
  last_brake_change_km numeric not null default 0,
  wear_cost_per_km numeric not null default 20,
  driver_name text not null default 'Conductor',
  driver_phone text not null default '',
  vtv_expiry date,
  license_expiry date,
  insurance_expiry date
);

-- Fila única de configuración.
insert into public.settings (id) values (1)
  on conflict (id) do nothing;

-- =====================================================================
--  Row Level Security (RLS)
--  Los registros privados se limitan al propietario autenticado.
--  La agenda pública se consulta exclusivamente mediante la función segura
--  get_public_driver_portal, que solo devuelve horarios y contacto comercial.
-- =====================================================================

alter table public.trips enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.fixed_costs enable row level security;
alter table public.saved_addresses enable row level security;
alter table public.settings enable row level security;
alter table public.driver_settings enable row level security;

-- Políticas de propiedad para cuentas autenticadas.
drop policy if exists "public all trips" on public.trips;
drop policy if exists "owner all trips" on public.trips;
create policy "owner all trips" on public.trips
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.trips to authenticated;
grant select, insert, update, delete on public.fuel_logs to authenticated;
grant select, insert, update, delete on public.maintenance_logs to authenticated;
grant select, insert, update, delete on public.fixed_costs to authenticated;
grant select, insert, update, delete on public.saved_addresses to authenticated;
grant select, insert, update, delete on public.driver_settings to authenticated;

drop policy if exists "public all fuel_logs" on public.fuel_logs;
drop policy if exists "owner all fuel_logs" on public.fuel_logs;
create policy "owner all fuel_logs" on public.fuel_logs
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "public all maintenance_logs" on public.maintenance_logs;
drop policy if exists "owner all maintenance_logs" on public.maintenance_logs;
create policy "owner all maintenance_logs" on public.maintenance_logs
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "public all fixed_costs" on public.fixed_costs;
drop policy if exists "owner all fixed_costs" on public.fixed_costs;
create policy "owner all fixed_costs" on public.fixed_costs
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "public all saved_addresses" on public.saved_addresses;
drop policy if exists "owner all saved_addresses" on public.saved_addresses;
create policy "owner all saved_addresses" on public.saved_addresses
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "public all settings" on public.settings;
drop policy if exists "authenticated all driver_settings" on public.driver_settings;
create policy "authenticated all driver_settings" on public.driver_settings
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

revoke all on public.trips, public.fuel_logs, public.maintenance_logs,
  public.fixed_costs, public.saved_addresses, public.settings,
  public.driver_settings from public, anon;
revoke all on public.settings from authenticated;

-- =====================================================================
--  Migración para instalaciones existentes
--  Si ya creaste las tablas antes, estos ALTER agregan las columnas
--  nuevas sin borrar datos. Son idempotentes (no fallan si ya existen).
-- =====================================================================

alter table public.trips add column if not exists distance_km numeric;
alter table public.trips add column if not exists blocked_until timestamptz;

-- Tipo de cuenta para la suscripción por chofer. Las cuentas existentes y las
-- nuevas arrancan en VIP_GRATIS; el paso a VIP_PAGO se hace a mano cambiando la
-- columna tipo_cuenta en la tabla driver_settings.
alter table public.driver_settings
  add column if not exists tipo_cuenta text not null default 'VIP_GRATIS';

alter table public.settings add column if not exists wear_cost_per_km numeric not null default 20;
alter table public.settings add column if not exists driver_name text not null default 'Conductor';
alter table public.settings add column if not exists driver_phone text not null default '';
alter table public.settings add column if not exists vtv_expiry date;
alter table public.settings add column if not exists license_expiry date;
alter table public.settings add column if not exists insurance_expiry date;

-- Los registros preexistentes quedan con owner_id NULL y no son visibles para
-- ninguna cuenta hasta que el propietario los asigne de forma explícita.
-- Tras crear la cuenta del chofer, su UUID se obtiene de Authentication >
-- Users y se usa para asignar owner_id a sus registros legados. No se reclama
-- automáticamente información histórica para evitar que otra cuenta la tome.

-- Only the fields required to display the public booking portal are exposed.
-- Passenger names, phone numbers, notes and amounts are never returned.
create or replace function public.get_public_driver_portal(p_driver_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'driver_name', ds.driver_name,
    'driver_phone', ds.driver_phone,
    'currency', ds.currency,
    'cost_per_km', ds.cost_per_km,
    'busy_intervals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'start_at', t.scheduled_at,
        'end_at', coalesce(t.blocked_until, t.scheduled_at + interval '2 hours')
      ) order by t.scheduled_at)
      from public.trips t
      where t.owner_id = ds.owner_id
        and t.status <> 'cancelled'
        and coalesce(t.blocked_until, t.scheduled_at + interval '2 hours') > now()
        and t.scheduled_at < now() + interval '8 days'
    ), '[]'::jsonb)
  )
  from public.driver_settings ds
  where ds.driver_slug = lower(trim(p_driver_slug))
  limit 1;
$$;

revoke all on function public.get_public_driver_portal(text) from public;
grant execute on function public.get_public_driver_portal(text) to anon, authenticated;

-- ¡Listo! Copia la URL y la "anon public key" de tu proyecto
-- (Settings → API) al archivo .env para conectar la app.
