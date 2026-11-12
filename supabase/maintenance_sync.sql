-- TKE PBB Maintenance · sincronización privada de órdenes e informes
-- Ejecutar una sola vez en Supabase > SQL Editor.
create table if not exists public.maintenance_records (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('order','diagnostic')),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.maintenance_records enable row level security;
drop policy if exists "Users can read own maintenance records" on public.maintenance_records;
create policy "Users can read own maintenance records"
on public.maintenance_records for select to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users can insert own maintenance records" on public.maintenance_records;
create policy "Users can insert own maintenance records"
on public.maintenance_records for insert to authenticated
with check (auth.uid() = user_id);
drop policy if exists "Users can update own maintenance records" on public.maintenance_records;
create policy "Users can update own maintenance records"
on public.maintenance_records for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
drop policy if exists "Users can delete own maintenance records" on public.maintenance_records;
create policy "Users can delete own maintenance records"
on public.maintenance_records for delete to authenticated
using (auth.uid() = user_id);
create index if not exists maintenance_records_user_type_idx
on public.maintenance_records(user_id, record_type);
