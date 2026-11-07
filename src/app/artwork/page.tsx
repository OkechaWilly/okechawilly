import { ArtworkGallery, type PublicArtwork } from "@/components/artwork-gallery";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/site";
import ShopPageBanner from "@/components/shop-page-banner";

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
    <>
      <ShopPageBanner
        eyebrow="The portfolio"
        title="Artwork"
        description="A selection of paintings, visual studies and ongoing explorations. This archive brings together finished works and ideas in progress."
        aside={"Original works & visual studies\nFrom the studio in Uganda"}
      />
      <main className="container py-16 md:py-20">
      {error ? (
        <p className="mt-10 border border-[#d9b7a9] bg-[#fbf2ee] p-5 text-sm text-[#8b4937]">
          The artwork catalogue is temporarily unavailable. Please check back shortly.
        </p>
      ) : <ArtworkGallery artworks={artworks} />}
      </main>
    </>
  );
}
