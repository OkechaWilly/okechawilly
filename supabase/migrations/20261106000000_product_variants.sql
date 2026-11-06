-- Configurable, individually priced product variants.
-- Each row represents one sellable combination (for example, A3 / Unframed).
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  size text,
  finish text,
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'UGX',
  stock_quantity integer,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stock_quantity is null or stock_quantity >= 0)
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id, sort_order);

drop trigger if exists set_updated_at on public.product_variants;
create trigger set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;

drop policy if exists "Public read available product variants" on public.product_variants;
create policy "Public read available product variants"
  on public.product_variants for select
  using (
    is_available
    and exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published and p.status = 'active'
    )
    or public.is_admin()
  );

drop policy if exists "Admin full access" on public.product_variants;
create policy "Admin full access" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;
