import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { absoluteUrl } from "@/lib/site";
import { isCurrentlyAvailable } from "@/lib/shop";

// Rebuilt at most once an hour, so new artworks reach search engines without a redeploy.
export const revalidate = 3600;

const STATIC_PAGES = ["/", "/artwork", "/collections", "/shop", "/prints", "/about", "/journal", "/faq", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({ url: absoluteUrl(path) }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return entries;

  // Public data only, so no login cookies are needed (and the page can be cached).
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const modified = (value: string | null | undefined) => (value ? new Date(value) : undefined);

  // If one list cannot be read, leave that part out instead of failing the whole sitemap.
  const [artworks, products, collections, posts] = await Promise.all([
    supabase.from("artworks").select("slug, updated_at").eq("is_published", true),
    supabase
      .from("products")
      .select("slug, updated_at, product_type, price, currency, edition_size, edition_sold, stock_quantity, track_inventory, product_variants(price, currency, is_available, stock_quantity)")
      .eq("is_published", true)
      .eq("status", "active"),
    supabase.from("collections").select("slug, updated_at").eq("is_published", true),
    supabase.from("journal_posts").select("slug, updated_at, published_at").eq("status", "published"),
  ]);

  for (const row of artworks.data ?? []) entries.push({ url: absoluteUrl(`/artwork/${row.slug}`), lastModified: modified(row.updated_at) });
  for (const row of products.data ?? []) {
    if (isCurrentlyAvailable(row)) entries.push({ url: absoluteUrl(`/shop/${row.slug}`), lastModified: modified(row.updated_at) });
  }
  for (const row of collections.data ?? []) entries.push({ url: absoluteUrl(`/collections/${row.slug}`), lastModified: modified(row.updated_at) });
  for (const row of posts.data ?? []) entries.push({ url: absoluteUrl(`/journal/${row.slug}`), lastModified: modified(row.updated_at ?? row.published_at) });

  return entries;
}
