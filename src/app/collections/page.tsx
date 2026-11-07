import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { pageMetadata } from "@/lib/site";
import ShopPageBanner from "@/components/shop-page-banner";

export const metadata = pageMetadata({
  title: "Collections",
  description: "Selected bodies of work gathered around ideas, observations and recurring themes.",
  path: "/collections",
});

export default async function Collections() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("*, collection_artworks(count)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const collections = (data ?? []).map((collection) => ({
    ...collection,
    image: collection.cover_image
      ? collection.cover_image.startsWith("http")
        ? collection.cover_image
        : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl
      : "",
    artworkCount: collection.collection_artworks?.[0]?.count ?? 0,
  }));

  return (
    <>
      <ShopPageBanner
        eyebrow="The artist’s archive"
        title="Collections"
        description="Explore selected bodies of work, gathered around ideas, observations and recurring themes. Each collection offers a closer look at a particular part of the practice."
        aside={"Selected bodies of work\nIdeas, observations & recurring themes"}
      />
      <main className="container pb-24 pt-12 md:pt-16">

      <div className="mt-14 flex items-center justify-between border-y border-[#dedad2] py-4">
        <p className="eyebrow">Selected bodies of work</p>
        <p className="text-[10px] uppercase tracking-[.14em] text-[#89847c]">
          {String(collections.length).padStart(2, "0")} {collections.length === 1 ? "collection" : "collections"}
        </p>
      </div>

      {collections.length ? (
        <div className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <Link key={collection.id} href={"/collections/" + collection.slug} className="group block">
              <div className="image-hover relative aspect-[4/5] overflow-hidden bg-[#e7e2d9]">
                {collection.image ? (
                  <Image
                    src={collection.image}
                    alt={collection.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center">
                    <span className="serif text-4xl text-[#77736d]">{collection.title}</span>
                  </div>
                )}
                <span className="absolute left-4 top-4 bg-[#f7f6f2]/90 px-3 py-2 text-[9px] uppercase tracking-[.15em] text-[#625e57]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Collection</p>
                  <h2 className="serif mt-2 text-3xl transition-colors group-hover:text-[#9c8062]">{collection.title}</h2>
                </div>
                <span className="mt-5 text-xs text-[#89847c]">{collection.artworkCount} works ↗</span>
              </div>
              {collection.description && (
                <p className="mt-3 max-w-md text-sm leading-6 text-[#77736d]">{collection.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-[#cfcac0] bg-[#f7f6f2] px-6 py-20 text-center">
          <p className="display text-3xl">A body of work in progress.</p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#77736d]">
            New collections will appear here as selected works are brought together and published.
          </p>
          <Link href="/artwork" className="mt-7 inline-block text-[10px] uppercase tracking-[.16em] underline underline-offset-4">
            Explore all artwork
          </Link>
        </div>
      )}
      </main>
    </>
  );
}
