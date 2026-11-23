-- Keep anonymous reads independent of the admin helper. The helper is
-- intentionally not executable by anon, so invoking it in a shared policy
-- prevents even published rows from being selected.
drop policy if exists "Public read published living space photos" on public.living_space_photos;

create policy "Public read published living space photos"
  on public.living_space_photos
  for select
  to anon
  using (is_published);

create policy "Authenticated read living space photos"
  on public.living_space_photos
  for select
  to authenticated
  using (is_published or (select public.is_admin()));
