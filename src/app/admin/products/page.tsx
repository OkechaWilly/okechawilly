import { createClient } from "@/lib/supabase/server";
import ProductManager from "@/components/admin/product-manager";

export default async function AdminProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: artworks }] = await Promise.all([
    supabase.from("products").select("*, product_images(*), product_variants(*)").order("created_at", { ascending: false }),
    supabase.from("artworks").select("id, title, year").order("title"),
  ]);
  return <ProductManager initialProducts={(products || []) as never} artworks={artworks || []} />;
}
