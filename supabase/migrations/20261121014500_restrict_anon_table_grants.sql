-- Reduce direct Data API privileges. RLS remains the row-level boundary.
-- Anonymous visitors need published catalogue reads and enquiry submission only.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE
  public.artist_profile,
  public.artwork_images,
  public.artworks,
  public.collection_artworks,
  public.collections,
  public.journal_posts,
  public.product_images,
  public.product_variants,
  public.products
TO anon;
GRANT INSERT ON TABLE public.inquiries TO anon;

-- TRUNCATE bypasses RLS. These elevated table privileges are not required by the app.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
