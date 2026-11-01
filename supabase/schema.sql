-- Okecha Willy artist platform
-- Run this in the Supabase SQL Editor for a new project.
-- Create the first admin user in Supabase Auth, then insert that user's UUID
-- into public.profiles with role = 'admin' (instructions in README).

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_image text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  year integer,
  medium text,
  width_cm numeric(8,2),
  height_cm numeric(8,2),
  depth_cm numeric(8,2),
  description text,
  story text,
  category text,
  status text not null default 'draft'
    check (status in ('draft', 'available', 'reserved', 'sold', 'not_for_sale', 'study')),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artwork_images (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (artwork_id, storage_path)
);

create table if not exists public.collection_artworks (
  collection_id uuid not null references public.collections(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (collection_id, artwork_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  product_type text not null
    check (product_type in ('original', 'limited_print', 'open_print', 'merchandise', 'art_object')),
  description text,
  price numeric(12,2),
  currency text not null default 'UGX',
  artwork_id uuid references public.artworks(id) on delete set null,
  edition_size integer,
  edition_sold integer not null default 0,
  sku text unique,
  stock_quantity integer,
  track_inventory boolean not null default true,
  options jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived', 'sold_out')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (edition_size is null or edition_size > 0),
  check (edition_sold >= 0),
  check (edition_size is null or edition_sold <= edition_size),
  check (stock_quantity is null or stock_quantity >= 0)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  currency text not null default 'UGX',
  subtotal numeric(12,2) not null default 0,
  shipping_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  shipping_address jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled', 'refunded')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  payment_provider text,
  payment_reference text,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_title text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  selected_options jsonb not null default '{}'::jsonb
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  artwork_id uuid references public.artworks(id) on delete set null,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artworks_public_idx on public.artworks (is_published, sort_order);
create index if not exists products_public_idx on public.products (is_published, status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);
create index if not exists journal_public_idx on public.journal_posts (status, published_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['collections','artworks','products','orders','journal_posts']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.collections enable row level security;
alter table public.artworks enable row level security;
alter table public.artwork_images enable row level security;
alter table public.collection_artworks enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inquiries enable row level security;
alter table public.journal_posts enable row level security;

-- Public visitors can read published catalogue content only.
drop policy if exists "Public read published collections" on public.collections;
create policy "Public read published collections" on public.collections for select using (is_published or public.is_admin());
drop policy if exists "Public read published artworks" on public.artworks;
create policy "Public read published artworks" on public.artworks for select using (is_published or public.is_admin());
drop policy if exists "Public read artwork images" on public.artwork_images;
create policy "Public read artwork images" on public.artwork_images for select using (
  exists (select 1 from public.artworks a where a.id = artwork_id and a.is_published) or public.is_admin()
);
drop policy if exists "Public read collection links" on public.collection_artworks;
create policy "Public read collection links" on public.collection_artworks for select using (
  exists (select 1 from public.collections c where c.id = collection_id and c.is_published) or public.is_admin()
);
drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products for select using ((is_published and status = 'active') or public.is_admin());
drop policy if exists "Public read product images" on public.product_images;
create policy "Public read product images" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_published and p.status = 'active') or public.is_admin()
);
drop policy if exists "Public read published journal" on public.journal_posts;
create policy "Public read published journal" on public.journal_posts for select using (status = 'published' or public.is_admin());

-- Only the designated admin can manage catalogue and operational records.
do $$
declare
  t text;
begin
  foreach t in array array['collections','artworks','artwork_images','collection_artworks','products','product_images','orders','order_items','inquiries','journal_posts']
  loop
    execute format('drop policy if exists "Admin full access" on public.%I', t);
    execute format('create policy "Admin full access" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (id = (select auth.uid()) or public.is_admin());
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Create public buckets for published artwork and product imagery.
insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true),
       ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public view artwork files" on storage.objects;
create policy "Public view artwork files" on storage.objects for select
using (bucket_id in ('artwork-images', 'product-images'));
drop policy if exists "Admin upload artwork files" on storage.objects;
create policy "Admin upload artwork files" on storage.objects for insert
with check (bucket_id in ('artwork-images', 'product-images') and public.is_admin());
drop policy if exists "Admin update artwork files" on storage.objects;
create policy "Admin update artwork files" on storage.objects for update
using (bucket_id in ('artwork-images', 'product-images') and public.is_admin())
with check (bucket_id in ('artwork-images', 'product-images') and public.is_admin());
drop policy if exists "Admin delete artwork files" on storage.objects;
create policy "Admin delete artwork files" on storage.objects for delete
using (bucket_id in ('artwork-images', 'product-images') and public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.collections, public.artworks, public.artwork_images,
  public.collection_artworks, public.products, public.product_images,
  public.journal_posts to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.collections,
  public.artworks, public.artwork_images, public.collection_artworks,
  public.products, public.product_images, public.orders, public.order_items,
  public.inquiries, public.journal_posts to authenticated;


-- Allow visitors to submit contact enquiries without exposing enquiry records.
drop policy if exists "Public submit enquiries" on public.inquiries;
create policy "Public submit enquiries" on public.inquiries
for insert to anon, authenticated
with check (
  length(trim(name)) between 1 and 120
  and length(trim(email)) between 3 and 254
  and length(trim(message)) between 10 and 5000
  and (subject is null or length(subject) <= 120)
);
grant insert on public.inquiries to anon, authenticated;
