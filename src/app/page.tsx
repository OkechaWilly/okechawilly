import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArtworkCard } from "@/components/artwork-card";
import Image from "next/image";
import { FeaturedArtworkHero } from "@/components/featured-artwork-hero";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: featuredData }, { data: collectionData }] = await Promise.all([
    supabase
      .from("artworks")
      .select("*, artwork_images(*)")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("collections")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const featured = (featuredData ?? []).map((artwork) => {
    const images = [...(artwork.artwork_images ?? [])].sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        a.sort_order - b.sort_order,
    );
    const primaryImage = images[0];
    const image = primaryImage?.storage_path
      ? supabase.storage.from("artwork-images").getPublicUrl(primaryImage.storage_path).data.publicUrl
      : "";

    return {
      slug: artwork.slug,
      title: artwork.title,
      year: artwork.year?.toString() ?? "Undated",
      medium: artwork.medium ?? "Medium not specified",
      image,
      imageAlt: primaryImage?.alt_text || artwork.title,
      status: artwork.status.replaceAll("_", " "),
      category: artwork.category,
    };
  });

  const aboutArtwork = featured[1] ?? featured[0];
  const selectedWorks = featured.slice(0, 4);
  const collections = (collectionData ?? []).map((collection) => ({
    ...collection,
    image: collection.cover_image
      ? collection.cover_image.startsWith("http")
        ? collection.cover_image
        : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl
      : "",
  }));

  return (
    <div>
      <FeaturedArtworkHero artworks={featured} />

      <section className="border-y border-[#e8e5de] py-6">
        <div className="container flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">A visual practice rooted in curiosity</p>
          <p className="serif text-lg italic text-[#77736d]">Wakiso · Uganda · Everywhere</p>
        </div>
      </section>

      <section className="container py-20 md:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-3">Browse the practice</p>
            <h2 className="display text-5xl md:text-6xl">Explore collections</h2>
          </div>
          <Link
            href="/collections"
            className="border-b border-[#c9c5bc] pb-2 text-[10px] uppercase tracking-[.14em] transition hover:border-[#9c8062]"
          >
            All collections ↗
          </Link>
        </div>
        {collections.length ? (
          <div className="grid gap-7 md:grid-cols-3">
            {collections.map((collection, index) => (
              <Link
                href={"/collections/" + collection.slug}
                key={collection.id}
                className="group"
              >
                <div className="image-hover relative aspect-[4/5] overflow-hidden bg-[#e7e2d9]">
                  {collection.image ? (
                    <Image
                      src={collection.image}
                      alt={collection.title}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <span className="serif text-3xl">{collection.title}</span>
                    </div>
                  )}
                  <span className="absolute bottom-4 left-4 bg-[#f7f6f2]/90 px-3 py-2 text-[9px] uppercase tracking-[.14em]">
                    Collection 0{index + 1}
                  </span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="serif text-2xl transition-colors group-hover:text-[#9c8062]">
                      {collection.title}
                    </h3>
                    {collection.description && (
                      <p className="mt-2 max-w-sm text-xs leading-6 text-[#77736d]">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <span className="pt-1 transition-transform group-hover:translate-x-1">↗</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#77736d]">
            New collections will appear here as they are published.
          </p>
        )}
      </section>

      <section className="bg-[#eeece6] py-20 md:py-24">
        <div className="container">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">A selection from the portfolio</p>
              <h2 className="display text-5xl md:text-6xl">Selected works</h2>
            </div>
            <Link
              href="/artwork"
              className="border-b border-[#c9c5bc] pb-2 text-[10px] uppercase tracking-[.14em] transition hover:border-[#9c8062]"
            >
              View all works ↗
            </Link>
          </div>
          {selectedWorks.length ? (
            <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {selectedWorks.map((artwork) => (
                <ArtworkCard key={artwork.slug} item={artwork} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#77736d]">
              Published artworks will appear here once they are added to the portfolio.
            </p>
          )}
        </div>
      </section>

      <section className="container grid gap-12 py-20 md:grid-cols-2 md:items-center md:py-24">
        <div className="relative flex aspect-[4/4.2] items-end overflow-hidden bg-[#e9e5dc] p-8 md:p-12">
          {aboutArtwork?.image && (
            <Image
              src={aboutArtwork.image}
              alt={aboutArtwork.imageAlt || aboutArtwork.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#171613]/80 via-[#171613]/15 to-transparent" />
          <div className="absolute right-8 top-8 text-[10px] uppercase tracking-[.16em] text-white/85">
            Artist · Observer · Maker
          </div>
          <div className="relative z-10 text-[#f7f6f2]">
            <p className="eyebrow !text-[#e2cdb3]">Okecha Willy · Uganda</p>
            <p className="display mt-5 max-w-sm text-5xl leading-[1.05] md:text-6xl">
              Art, memory
              <br />
              and the world
              <br />
              <em className="text-[#e2cdb3]">around us.</em>
            </p>
          </div>
        </div>
        <div className="max-w-lg md:pl-5">
          <p className="eyebrow mb-4">A little about the artist</p>
          <h2 className="display text-5xl md:text-6xl">
            Making sense
            <br />
            of the world.
          </h2>
          <p className="mt-7 text-sm leading-7 text-[#77736d]">
            My practice moves between observation, storytelling and experimentation. I am interested in the ways art can hold memory, question belief and open up new ways of seeing the world around us.
          </p>
          <Link
            href="/about"
            className="mt-8 inline-flex items-center gap-5 border-b border-[#242320] pb-2 text-[10px] uppercase tracking-[.15em] transition-colors hover:border-[#9c8062] hover:text-[#9c8062]"
          >
            Read my story <span>↗</span>
          </Link>
        </div>
      </section>

      <section className="container pb-20 md:pb-24">
        <div className="relative overflow-hidden bg-[#242320] px-8 py-16 text-center text-[#f7f6f2] md:px-20 md:py-20">
          <span className="absolute left-8 top-8 h-10 w-10 border-l border-t border-[#766a5c]" />
          <span className="absolute bottom-8 right-8 h-10 w-10 border-b border-r border-[#766a5c]" />
          <p className="eyebrow !text-[#c6b49e]">Commissions · Collaborations · Enquiries</p>
          <h2 className="display mx-auto mt-5 max-w-2xl text-5xl md:text-6xl">
            Let’s make room for a conversation.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#c5c1b9]">
            Interested in an original work, a commission or a creative collaboration? I would love to hear from you.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-5 bg-[#f7f6f2] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#242320] transition-colors hover:bg-[#c6b49e] hover:!text-[#242320]"
          >
            Get in touch <span>↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
