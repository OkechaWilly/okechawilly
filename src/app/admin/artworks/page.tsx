import { createClient } from "@/lib/supabase/server";
import ArtworkManager from "@/components/admin/artwork-manager";

export default async function AdminArtworksPage() {
  const supabase = await createClient();

  const [{ data: artworks, error: artworkError }, { data: collections, error: collectionError }] =
    await Promise.all([
      supabase
        .from("artworks")
        .select("*, artwork_images(*), collection_artworks(collection_id)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("collections").select("id, title").order("sort_order"),
    ]);

  return (
    <ArtworkManager
      initialArtworks={artworks ?? []}
      collections={collections ?? []}
      loadError={artworkError?.message || collectionError?.message || null}
    />
  );
}
