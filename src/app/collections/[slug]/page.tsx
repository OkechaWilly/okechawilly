import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArtworkCard } from "@/components/artwork-card";
import { notFound } from "next/navigation";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase.from("collections").select("*, collection_artworks(artwork:artworks(*, artwork_images(*)))").eq("slug", slug).eq("is_published", true).single();
  if (!collection) notFound();

  const artworks = (collection.collection_artworks ?? [])
    .map((entry: any) => entry.artwork)
    .filter((artwork: any) => artwork && artwork.is_published)
    .map((artwork: any) => {
      const images = [...(artwork.artwork_images ?? [])].sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
      const image = images[0]?.storage_path ? supabase.storage.from("artwork-images").getPublicUrl(images[0].storage_path).data.publicUrl : "";
      return { slug: artwork.slug, title: artwork.title, year: artwork.year?.toString() ?? "Undated", medium: artwork.medium ?? "Medium not specified", image, status: artwork.status.replaceAll("_", " ") };
    });
  const coverImage = collection.cover_image ? (collection.cover_image.startsWith("http") ? collection.cover_image : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl) : "";

  return <main className="container py-16">
    <Link href="/collections" className="eyebrow">← All collections</Link>
    <div className="mt-8 grid gap-10 md:grid-cols-2">
      <div className="aspect-[4/3] overflow-hidden bg-[#e7e2d9]">{coverImage ? <img src={coverImage} alt={collection.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-8 text-center"><span className="serif text-4xl">{collection.title}</span></div>}</div>
      <div className="self-center"><p className="eyebrow">Collection</p><h1 className="display mt-4 text-6xl">{collection.title}</h1>{collection.description && <p className="mt-6 max-w-md text-sm leading-7 text-[#77736d]">{collection.description}</p>}</div>
    </div>
    <div className="mt-16">{artworks.length ? <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{artworks.map((artwork: any) => <ArtworkCard key={artwork.slug} item={artwork}/>)}</div> : <p className="text-sm text-[#77736d]">No published artworks have been added to this collection yet.</p>}</div>
  </main>;
}
