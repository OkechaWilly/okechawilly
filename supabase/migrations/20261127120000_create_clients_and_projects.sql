-- Studio-managed client collaborations and commissioned project case studies.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  logo_path text,
  website_url text,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text,
  brief text,
  approach text,
  outcome text,
  project_type text not null default 'Commission',
  location text,
  timeframe text,
  cover_image text,
  gallery jsonb not null default '[]'::jsonb check (jsonb_typeof(gallery) = 'array'),
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_public_order_idx
  on public.clients (is_published, is_featured desc, sort_order, name);
create index if not exists projects_public_order_idx
  on public.projects (is_published, is_featured desc, sort_order, created_at desc);
create index if not exists projects_client_id_idx on public.projects (client_id);

drop trigger if exists set_updated_at on public.clients;
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Public read published clients" on public.clients;
create policy "Public read published clients" on public.clients
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Admin manage clients" on public.clients;
create policy "Admin manage clients" on public.clients
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Public read published projects" on public.projects;
create policy "Public read published projects" on public.projects
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Admin manage projects" on public.projects;
create policy "Admin manage projects" on public.projects
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.clients, public.projects to anon, authenticated;
grant insert, update, delete on public.clients, public.projects to authenticated;
