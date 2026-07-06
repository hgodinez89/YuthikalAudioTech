-- Tabla mínima para el ping de keep-alive (previene la pausa por inactividad del free tier).
-- La ruta /api/keepalive hace un SELECT con la anon key; leer ya cuenta como actividad de BD.
create table if not exists public.keepalive (
  id smallint primary key default 1,
  last_seen_at timestamptz not null default now(),
  constraint keepalive_single_row check (id = 1)
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- Solo lectura pública; nadie puede escribir desde el cliente.
create policy "keepalive_public_read" on public.keepalive
  for select using (true);
