import { createClient } from "@/lib/supabase/server";
import CollectionManager from "@/components/admin/collection-manager";

export default async function AdminCollectionsPage() {
  const supabase = await createClient();
  const [{ data: collections, error: collectionError }, { data: artworks, error: artworkError }] = await Promise.all([
    supabase.from("collections").select("*, collection_artworks(artwork_id)").order("sort_order").order("created_at", { ascending: false }),
    supabase.from("artworks").select("id, title, is_published").order("title"),
  ]);

  if (collectionError || artworkError) {
    return <div className="border border-[#d9b7a9] bg-[#fbf2ee] p-5 text-sm text-[#8b4937]">Could not load collections: {collectionError?.message || artworkError?.message}</div>;
  }

  return <CollectionManager initialCollections={collections ?? []} artworks={artworks ?? []} />;
}
