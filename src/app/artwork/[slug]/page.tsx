import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ArtworkDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: artwork } = await supabase
    .from("artworks")
    .select("*, artwork_images(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!artwork) notFound();

  const images = [...(artwork.artwork_images ?? [])].sort((a, b) =>
    Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  const imageUrls = images.map((image) => ({
    url: supabase.storage.from("artwork-images").getPublicUrl(image.storage_path).data.publicUrl,
    alt: image.alt_text || artwork.title,
  }));

  return (
    <main className="container py-14">
      <Link href="/artwork" className="eyebrow">← Back to artwork</Link>
      <div className="mt-10 grid gap-12 md:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          {imageUrls.length ? imageUrls.map((image, index) => (
            <div key={index} className="overflow-hidden bg-[#e8e4dc]">
              <img src={image.url} alt={image.alt} className="h-auto w-full" />
            </div>
          )) : <div className="flex aspect-[4/5] items-center justify-center bg-[#e8e4dc] text-xs uppercase tracking-widest text-[#89847c]">Artwork photograph coming soon</div>}
        </div>
        <div className="pt-5">
          <p className="eyebrow">{artwork.category || "Artwork"}</p>
          <h1 className="display mt-4 text-6xl">{artwork.title}</h1>
          {artwork.description && <p className="mt-6 text-sm leading-7 text-[#77736d]">{artwork.description}</p>}
          {artwork.story && <div className="mt-6 whitespace-pre-line text-sm leading-7 text-[#77736d]">{artwork.story}</div>}
          <div className="my-10 border-y border-[#e8e5de] py-6 text-sm">
            <div className="flex justify-between py-2"><span className="text-[#77736d]">Year</span><span>{artwork.year || "—"}</span></div>
            <div className="flex justify-between py-2"><span className="text-[#77736d]">Medium</span><span>{artwork.medium || "—"}</span></div>
            <div className="flex justify-between py-2"><span className="text-[#77736d]">Dimensions</span><span>{artwork.width_cm && artwork.height_cm ? `${artwork.width_cm} × ${artwork.height_cm} cm` : "—"}</span></div>
            <div className="flex justify-between py-2"><span className="text-[#77736d]">Availability</span><span>{artwork.status.replaceAll("_", " ")}</span></div>
          </div>
          <Link href="/contact" className="mt-2 inline-block bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white">Enquire about this work ↗</Link>
        </div>
      </div>
    </main>
  );
}
