-- Consolidate overlapping public-read and administrator policies without changing access.
-- Anonymous visitors retain published-content access. Authenticated visitors receive
-- the same published access plus full administrator access when is_admin() is true.

DROP POLICY IF EXISTS "Admin manage artist profile" ON public.artist_profile;
DROP POLICY IF EXISTS "Public read published artist profile" ON public.artist_profile;
CREATE POLICY "Public read published artist profile" ON public.artist_profile FOR SELECT TO anon USING (is_published);
CREATE POLICY "Authenticated read artist profile" ON public.artist_profile FOR SELECT TO authenticated USING ((select public.is_admin()) OR is_published);
CREATE POLICY "Admin insert artist profile" ON public.artist_profile FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update artist profile" ON public.artist_profile FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete artist profile" ON public.artist_profile FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.artwork_images;
DROP POLICY IF EXISTS "Public read artwork images" ON public.artwork_images;
CREATE POLICY "Public read artwork images" ON public.artwork_images FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_images.artwork_id AND a.is_published));
CREATE POLICY "Authenticated read artwork images" ON public.artwork_images FOR SELECT TO authenticated USING ((select public.is_admin()) OR EXISTS (SELECT 1 FROM public.artworks a WHERE a.id = artwork_images.artwork_id AND a.is_published));
CREATE POLICY "Admin insert artwork images" ON public.artwork_images FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update artwork images" ON public.artwork_images FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete artwork images" ON public.artwork_images FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.artworks;
DROP POLICY IF EXISTS "Public read published artworks" ON public.artworks;
CREATE POLICY "Public read published artworks" ON public.artworks FOR SELECT TO anon USING (is_published);
CREATE POLICY "Authenticated read artworks" ON public.artworks FOR SELECT TO authenticated USING ((select public.is_admin()) OR is_published);
CREATE POLICY "Admin insert artworks" ON public.artworks FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update artworks" ON public.artworks FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete artworks" ON public.artworks FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.collection_artworks;
DROP POLICY IF EXISTS "Public read collection links" ON public.collection_artworks;
CREATE POLICY "Public read collection links" ON public.collection_artworks FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_artworks.collection_id AND c.is_published));
CREATE POLICY "Authenticated read collection links" ON public.collection_artworks FOR SELECT TO authenticated USING ((select public.is_admin()) OR EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_artworks.collection_id AND c.is_published));
CREATE POLICY "Admin insert collection links" ON public.collection_artworks FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update collection links" ON public.collection_artworks FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete collection links" ON public.collection_artworks FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.collections;
DROP POLICY IF EXISTS "Public read published collections" ON public.collections;
CREATE POLICY "Public read published collections" ON public.collections FOR SELECT TO anon USING (is_published);
CREATE POLICY "Authenticated read collections" ON public.collections FOR SELECT TO authenticated USING ((select public.is_admin()) OR is_published);
CREATE POLICY "Admin insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update collections" ON public.collections FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete collections" ON public.collections FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.inquiries;
DROP POLICY IF EXISTS "Public submit enquiries" ON public.inquiries;
CREATE POLICY "Admin read inquiries" ON public.inquiries FOR SELECT TO authenticated USING ((select public.is_admin()));
CREATE POLICY "Public submit enquiries" ON public.inquiries FOR INSERT TO anon WITH CHECK (length(trim(name)) BETWEEN 1 AND 120 AND length(trim(email)) BETWEEN 3 AND 254 AND length(trim(message)) BETWEEN 10 AND 5000 AND (subject IS NULL OR length(subject) <= 120));
CREATE POLICY "Authenticated submit enquiries" ON public.inquiries FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()) OR (length(trim(name)) BETWEEN 1 AND 120 AND length(trim(email)) BETWEEN 3 AND 254 AND length(trim(message)) BETWEEN 10 AND 5000 AND (subject IS NULL OR length(subject) <= 120)));
CREATE POLICY "Admin update inquiries" ON public.inquiries FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete inquiries" ON public.inquiries FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.journal_posts;
DROP POLICY IF EXISTS "Public read published journal" ON public.journal_posts;
CREATE POLICY "Public read published journal" ON public.journal_posts FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Authenticated read journal" ON public.journal_posts FOR SELECT TO authenticated USING ((select public.is_admin()) OR status = 'published');
CREATE POLICY "Admin insert journal posts" ON public.journal_posts FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update journal posts" ON public.journal_posts FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete journal posts" ON public.journal_posts FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.product_images;
DROP POLICY IF EXISTS "Public read product images" ON public.product_images;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_published AND p.status = 'active'));
CREATE POLICY "Authenticated read product images" ON public.product_images FOR SELECT TO authenticated USING ((select public.is_admin()) OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.is_published AND p.status = 'active'));
CREATE POLICY "Admin insert product images" ON public.product_images FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update product images" ON public.product_images FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete product images" ON public.product_images FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.product_variants;
DROP POLICY IF EXISTS "Public read available product variants" ON public.product_variants;
CREATE POLICY "Public read available product variants" ON public.product_variants FOR SELECT TO anon USING (is_available AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_published AND p.status = 'active'));
CREATE POLICY "Authenticated read product variants" ON public.product_variants FOR SELECT TO authenticated USING ((select public.is_admin()) OR (is_available AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_published AND p.status = 'active')));
CREATE POLICY "Admin insert product variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update product variants" ON public.product_variants FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete product variants" ON public.product_variants FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admin full access" ON public.products;
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT TO anon USING (is_published AND status = 'active');
CREATE POLICY "Authenticated read products" ON public.products FOR SELECT TO authenticated USING ((select public.is_admin()) OR (is_published AND status = 'active'));
CREATE POLICY "Admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update products" ON public.products FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete products" ON public.products FOR DELETE TO authenticated USING ((select public.is_admin()));

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING ((select public.is_admin()) OR id = (select auth.uid()));
CREATE POLICY "Admin insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE TO authenticated USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));
CREATE POLICY "Admin delete profiles" ON public.profiles FOR DELETE TO authenticated USING ((select public.is_admin()));
