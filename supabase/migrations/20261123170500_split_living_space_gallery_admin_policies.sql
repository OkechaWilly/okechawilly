-- Avoid duplicate permissive SELECT policies: the public-read policy already
-- grants administrators access to all gallery rows through public.is_admin().
drop policy if exists "Admin manage living space photos" on public.living_space_photos;

drop policy if exists "Admin insert living space photos" on public.living_space_photos;
create policy "Admin insert living space photos"
  on public.living_space_photos for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admin update living space photos" on public.living_space_photos;
create policy "Admin update living space photos"
  on public.living_space_photos for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admin delete living space photos" on public.living_space_photos;
create policy "Admin delete living space photos"
  on public.living_space_photos for delete to authenticated
  using ((select public.is_admin()));
