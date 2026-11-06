import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkImageGallery } from "@/components/artwork-image-gallery";

export default async function ArtworkDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: artwork } = await supabase
    .from("artworks")
    .select("*, artwork_images(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!artwork) notFound();

  const images = [...(artwork.artwork_images ?? [])]
    .sort(
      (a, b) =>
        Number(b.is_primary) - Number(a.is_primary) ||
        a.sort_order - b.sort_order,
    )
    .map((image) => ({
      url: supabase.storage.from("artwork-images").getPublicUrl(image.storage_path).data.publicUrl,
      alt: image.alt_text || artwork.title,
    }));

  const status = String(artwork.status || "available").replaceAll("_", " ");
  const isAvailable = status.toLowerCase() === "available";
  const dimensionParts = [
    artwork.width_cm ? `${artwork.width_cm} W` : null,
    artwork.height_cm ? `${artwork.height_cm} H` : null,
    artwork.depth_cm ? `${artwork.depth_cm} D` : null,
  ].filter(Boolean);
  const dimensions = dimensionParts.length
    ? `${dimensionParts.join(" × ")} cm`
    : null;
  const hasArtworkDetails = Boolean(artwork.medium || dimensions);

  const enquirySubject = encodeURIComponent(`Enquiry about “${artwork.title}”`);

  return (
    <main className="container pb-20 pt-10 md:pb-28 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e8e5de] pb-5">
        <Link
          href="/artwork"
          className="eyebrow inline-flex items-center gap-3 transition-colors hover:text-[#9c8062]"
        >
          <span aria-hidden="true">←</span> Back to the portfolio
        </Link>
        <p className="text-[9px] uppercase tracking-[.16em] text-[#aaa49a]">
          Okecha Willy · Artwork archive
        </p>
      </div>

      <div className="grid gap-12 pt-9 md:grid-cols-[1.12fr_.88fr] md:gap-16 lg:gap-20">
        <div className="min-w-0">
          <ArtworkImageGallery images={images} title={artwork.title} />
          {images.length > 0 && (
            <p className="mt-5 text-[10px] leading-5 text-[#9b968d]">
              Images are presented as a visual record of the original work. Colours may vary slightly between screens.
            </p>
          )}
        </div>

        <aside className="md:sticky md:top-24 md:self-start">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{artwork.category || "Original artwork"}</p>
            <span className="h-px w-7 bg-[#c9b59e]" />
            <p className="text-[9px] uppercase tracking-[.14em] text-[#8a857c]">
              {status}
            </p>
          </div>

          <h1 className="display mt-5 text-5xl leading-[1.02] md:text-6xl lg:text-7xl">
            {artwork.title}
          </h1>

          {artwork.year && (
            <p className="mt-5 text-xs tracking-[.08em] text-[#8a857c]">
              Created {artwork.year}
            </p>
          )}

          {artwork.description && (
            <div className="mt-9">
              <p className="eyebrow mb-3">About the work</p>
              <p className="whitespace-pre-line text-sm leading-7 text-[#68645e]">
                {artwork.description}
              </p>
            </div>
          )}

          {artwork.story && (
            <div className="mt-8 border-l border-[#c9b59e] pl-5">
              <p className="eyebrow mb-3">Artist’s notes</p>
              <div className="whitespace-pre-line text-sm leading-7 text-[#68645e]">
                {artwork.story}
              </div>
            </div>
          )}

          {hasArtworkDetails && (
            <div className="my-9 border-y border-[#e8e5de] py-5">
              <p className="eyebrow mb-4">Artwork details</p>
              <dl className="space-y-4 text-xs">
                {artwork.medium && (
                  <div className="flex items-start justify-between gap-6">
                    <dt className="text-[#8a857c]">Medium</dt>
                    <dd className="max-w-[65%] text-right">{artwork.medium}</dd>
                  </div>
                )}
                {dimensions && (
                  <div className="flex items-start justify-between gap-6">
                    <dt className="text-[#8a857c]">Dimensions</dt>
                    <dd className="text-right">{dimensions}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <div className="space-y-4">
            <Link
              href={`/contact?subject=${enquirySubject}`}
              className="flex w-full items-center justify-between bg-[#242320] px-6 py-5 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition hover:bg-[#9c8062]"
            >
              <span>{isAvailable ? "Enquire about this work" : "Ask about this work"}</span>
              <span aria-hidden="true">↗</span>
            </Link>
            <p className="text-[10px] leading-5 text-[#9b968d]">
              {isAvailable
                ? "Interested in this piece? Get in touch for availability, pricing and delivery details."
                : "This work may no longer be available. Contact the studio for details or to discuss a similar commission."}
            </p>
          </div>

          <div className="mt-12 border-t border-[#e8e5de] pt-5">
            <p className="eyebrow">The artist</p>
            <p className="serif mt-2 text-2xl">Okecha Willy</p>
            <p className="mt-2 text-xs text-[#8a857c]">Wakiso, Uganda</p>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center gap-3 border-b border-[#c9c5bc] pb-2 text-[9px] uppercase tracking-[.15em] transition hover:border-[#9c8062] hover:text-[#9c8062]"
            >
              Discover the artist <span>↗</span>
            </Link>
          </div>
        </aside>
      </div>

      <div className="mt-20 border-t border-[#e8e5de] pt-7">
        <Link
          href="/artwork"
          className="inline-flex items-center gap-4 text-[10px] uppercase tracking-[.15em] transition hover:text-[#9c8062]"
        >
          <span>←</span> Continue exploring the portfolio
        </Link>
      </div>
    </main>
  );
}
