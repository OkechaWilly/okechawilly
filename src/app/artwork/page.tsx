import { ArtworkGallery, type PublicArtwork } from "@/components/artwork-gallery";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Artwork",
  description: "A selection of paintings, visual studies and ongoing explorations by Okecha Willy.",
  path: "/artwork",
});

export default async function Artwork() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artworks")
    .select("*, artwork_images(*)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const artworks: PublicArtwork[] = (data ?? []).map((artwork) => {
    const images = [...(artwork.artwork_images ?? [])].sort((a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
    );
    const image = images[0]?.storage_path
      ? supabase.storage.from("artwork-images").getPublicUrl(images[0].storage_path).data.publicUrl
      : "";
    return { ...artwork, image } as PublicArtwork;
  });

  return (
    <main className="container py-20 md:py-24">
      <p className="eyebrow">The portfolio</p>
      <h1 className="display mt-4 text-6xl md:text-8xl">Artwork<span className="text-[#9c8062]">.</span></h1>
      <p className="mt-6 max-w-xl text-sm leading-7 text-[#77736d]">
        A selection of paintings, visual studies and ongoing explorations.
        This archive brings together finished works and ideas in progress.
      </p>
      {error ? (
        <p className="mt-10 border border-[#d9b7a9] bg-[#fbf2ee] p-5 text-sm text-[#8b4937]">
          The artwork catalogue is temporarily unavailable. Please check back shortly.
        </p>
      ) : <ArtworkGallery artworks={artworks} />}
    </main>
  );
}
