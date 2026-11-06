import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArtworkCard } from "@/components/artwork-card";
import { notFound } from "next/navigation";
import Image from "next/image";

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("*, collection_artworks(artwork:artworks(*, artwork_images(*)))")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!collection) notFound();

  const artworks = (collection.collection_artworks ?? [])
    .map((entry: any) => entry.artwork)
    .filter((artwork: any) => artwork && artwork.is_published)
    .map((artwork: any) => {
      const images = [...(artwork.artwork_images ?? [])].sort(
        (a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
      );
      const image = images[0]?.storage_path
        ? supabase.storage.from("artwork-images").getPublicUrl(images[0].storage_path).data.publicUrl
        : "";
      return {
        slug: artwork.slug,
        title: artwork.title,
        year: artwork.year?.toString() ?? "Undated",
        medium: artwork.medium ?? "Medium not specified",
        image,
        status: artwork.status.replaceAll("_", " "),
      };
    });

  const coverImage = collection.cover_image
    ? collection.cover_image.startsWith("http")
      ? collection.cover_image
      : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl
    : "";

  return (
    <main className="container pb-24 pt-12 md:pt-16">
      <Link
        href="/collections"
        className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[.15em] text-[#77736d] transition-colors hover:text-[#9c8062]"
      >
        <span aria-hidden="true">←</span> All collections
      </Link>

      <section className="mt-9 grid gap-9 md:grid-cols-[1.15fr_.85fr] md:gap-14">
        <div className="relative aspect-[5/4] overflow-hidden bg-[#e7e2d9]">
          {coverImage ? (
            <Image src={coverImage} alt={collection.title} fill priority sizes="(min-width: 768px) 57vw, 100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <span className="serif text-5xl text-[#77736d]">{collection.title}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center py-4 md:py-10">
          <p className="eyebrow">A selected body of work</p>
          <h1 className="display mt-5 text-5xl leading-[1.02] md:text-7xl">{collection.title}<span className="text-[#9c8062]">.</span></h1>
          {collection.description && (
            <p className="mt-7 max-w-lg text-sm leading-7 text-[#77736d] md:text-base">{collection.description}</p>
          )}
          <div className="mt-9 flex items-center gap-5 border-t border-[#dedad2] pt-5">
            <div>
              <p className="display text-3xl">{String(artworks.length).padStart(2, "0")}</p>
              <p className="eyebrow mt-1">Works in this collection</p>
            </div>
            <span className="h-9 w-px bg-[#dedad2]" />
            <p className="max-w-[150px] text-xs leading-5 text-[#89847c]">A closer look at this part of the artist’s practice.</p>
          </div>
        </div>
      </section>

      <section className="mt-20">
        <div className="flex flex-col justify-between gap-3 border-b border-[#dedad2] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Explore the works</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">Within this collection</h2>
          </div>
          <p className="text-[10px] uppercase tracking-[.14em] text-[#89847c]">{artworks.length} {artworks.length === 1 ? "artwork" : "artworks"}</p>
        </div>
        {artworks.length ? (
          <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork: any) => <ArtworkCard key={artwork.slug} item={artwork} />)}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="serif text-2xl">Works are being added to this collection.</p>
            <p className="mt-3 text-sm text-[#77736d]">Please check back soon, or explore the complete artwork archive.</p>
            <Link href="/artwork" className="mt-6 inline-block text-[10px] uppercase tracking-[.16em] underline underline-offset-4">Browse all artwork</Link>
          </div>
        )}
      </section>

      <div className="mt-24 border-t border-[#dedad2] pt-8 text-center">
        <p className="eyebrow">Continue exploring</p>
        <Link href="/collections" className="serif mt-3 inline-block text-2xl transition-colors hover:text-[#9c8062]">View all collections ↗</Link>
      </div>
    </main>
  );
}
