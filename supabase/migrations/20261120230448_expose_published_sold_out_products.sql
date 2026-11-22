-- Keep published sold-out products visible in the public catalogue.
-- Draft and archived products remain private; variants are exposed only when enabled.
drop policy if exists "Public read active products" on public.products;
create policy "Public read published products" on public.products
  for select to anon
  using (is_published and status in ('active', 'sold_out'));

drop policy if exists "Authenticated read products" on public.products;
create policy "Authenticated read products" on public.products
  for select to authenticated
  using ((select is_admin()) or (is_published and status in ('active', 'sold_out')));

drop policy if exists "Public read product images" on public.product_images;
create policy "Public read published product images" on public.product_images
  for select to anon
  using (exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and p.is_published
      and p.status in ('active', 'sold_out')
  ));

drop policy if exists "Authenticated read product images" on public.product_images;
create policy "Authenticated read product images" on public.product_images
  for select to authenticated
  using ((select is_admin()) or exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and p.is_published
      and p.status in ('active', 'sold_out')
  ));

drop policy if exists "Public read available product variants" on public.product_variants;
create policy "Public read available published product variants" on public.product_variants
  for select to anon
  using (is_available and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and p.is_published
      and p.status in ('active', 'sold_out')
  ));

drop policy if exists "Authenticated read product variants" on public.product_variants;
create policy "Authenticated read product variants" on public.product_variants
  for select to authenticated
  using ((select is_admin()) or (is_available and exists (
    select 1 from public.products p
    where p.id = product_variants.product_id
      and p.is_published
      and p.status in ('active', 'sold_out')
  )));
