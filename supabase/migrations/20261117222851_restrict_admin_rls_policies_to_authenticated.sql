-- Restrict administrator-only row policies and Storage writes to signed-in users.
-- Public catalogue policies remain available to anon and authenticated visitors.
ALTER POLICY "Admin manage artist profile" ON public.artist_profile TO authenticated;
ALTER POLICY "Admin full access" ON public.artwork_images TO authenticated;
ALTER POLICY "Admin full access" ON public.artworks TO authenticated;
ALTER POLICY "Admin full access" ON public.collection_artworks TO authenticated;
ALTER POLICY "Admin full access" ON public.collections TO authenticated;
ALTER POLICY "Admin full access" ON public.inquiries TO authenticated;
ALTER POLICY "Admin full access" ON public.journal_posts TO authenticated;
ALTER POLICY "Admin full access" ON public.order_items TO authenticated;
ALTER POLICY "Admin full access" ON public.orders TO authenticated;
ALTER POLICY "Admin full access" ON public.product_images TO authenticated;
ALTER POLICY "Admin full access" ON public.product_variants TO authenticated;
ALTER POLICY "Admin full access" ON public.products TO authenticated;
ALTER POLICY "Admins manage profiles" ON public.profiles TO authenticated;

DROP POLICY "Public read published artist profile" ON public.artist_profile;
CREATE POLICY "Public read published artist profile" ON public.artist_profile
  FOR SELECT TO anon, authenticated USING (is_published);

DROP POLICY "Public read artwork images" ON public.artwork_images;
CREATE POLICY "Public read artwork images" ON public.artwork_images
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.artworks a
      WHERE a.id = artwork_images.artwork_id AND a.is_published)
  );

DROP POLICY "Public read published artworks" ON public.artworks;
CREATE POLICY "Public read published artworks" ON public.artworks
  FOR SELECT TO anon, authenticated USING (is_published);

DROP POLICY "Public read collection links" ON public.collection_artworks;
CREATE POLICY "Public read collection links" ON public.collection_artworks
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.collections c
      WHERE c.id = collection_artworks.collection_id AND c.is_published)
  );

DROP POLICY "Public read published collections" ON public.collections;
CREATE POLICY "Public read published collections" ON public.collections
  FOR SELECT TO anon, authenticated USING (is_published);

DROP POLICY "Public read published journal" ON public.journal_posts;
CREATE POLICY "Public read published journal" ON public.journal_posts
  FOR SELECT TO anon, authenticated USING (status = 'published');

DROP POLICY "Public read product images" ON public.product_images;
CREATE POLICY "Public read product images" ON public.product_images
  FOR SELECT TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.is_published AND p.status = 'active')
  );

DROP POLICY "Public read available product variants" ON public.product_variants;
CREATE POLICY "Public read available product variants" ON public.product_variants
  FOR SELECT TO anon, authenticated USING (
    is_available AND EXISTS (SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.is_published AND p.status = 'active')
  );

DROP POLICY "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
  FOR SELECT TO anon, authenticated USING (is_published AND status = 'active');

DROP POLICY "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = (select auth.uid()));

ALTER POLICY "Admin delete artwork files" ON storage.objects TO authenticated;
ALTER POLICY "Admin update artwork files" ON storage.objects TO authenticated;
ALTER POLICY "Admin upload artwork files" ON storage.objects TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
