import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArtworkImageGallery } from "@/components/artwork-image-gallery";
import { PRINT_TYPES, PRODUCT_TYPE_LABELS, isCurrentlyAvailable, priceLabel } from "@/lib/shop";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, absoluteUrl, pageMetadata, plainText, shareImage } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: artwork } = await supabase
    .from("artworks")
    .select("*, artwork_images(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (!artwork) return {};
  const cover = [...(artwork.artwork_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  )[0];
  const detail = [artwork.medium, artwork.year].filter(Boolean).join(", ");
  return pageMetadata({
    title: artwork.title,
    description: plainText(artwork.description || artwork.story) || `${detail ? `${detail}. ` : ""}Original artwork by ${SITE_NAME}.`,
    path: `/artwork/${artwork.slug}`,
    image: cover ? shareImage(supabase.storage.from("artwork-images").getPublicUrl(cover.storage_path).data.publicUrl) : undefined,
    imageAlt: cover?.alt_text || artwork.title,
  });
}

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

  const { data: linkedProductsData } = await supabase
    .from("products")
    .select("id, title, slug, product_type, price, currency, edition_size, edition_sold, stock_quantity, track_inventory, product_images(*), product_variants(price, currency, is_available, stock_quantity)")
    .eq("artwork_id", artwork.id)
    .eq("is_published", true)
    .eq("status", "active")
    .in("product_type", ["limited_print", "open_print", "wearable", "merchandise", "art_object"])
    .order("created_at", { ascending: false });

  const linkedProducts = (linkedProductsData ?? []).filter((product) => isCurrentlyAvailable(product)).map((product) => {
    const productImages = [...(product.product_images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    );
    const productCover = productImages[0];
    return {
      ...product,
      image: productCover
        ? supabase.storage.from("product-images").getPublicUrl(productCover.storage_path).data.publicUrl
        : "",
      imageAlt: productCover?.alt_text || product.title,
      priceLabel: priceLabel(product),
    };
  });

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

  // "Collect this work as a print" when everything linked is a print; otherwise the wider wording.
  const onlyPrints = linkedProducts.length > 0 && linkedProducts.every((product) => PRINT_TYPES.includes(product.product_type));

  const enquirySubject = encodeURIComponent(`Enquiry about “${artwork.title}”`);

  const dimensionValue = (value: number | string) => ({ "@type": "QuantitativeValue", value: Number(value), unitCode: "CMT" });
  const artworkSchema = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    url: absoluteUrl(`/artwork/${artwork.slug}`),
    creator: { "@type": "Person", name: SITE_NAME, url: SITE_URL },
    ...(images[0] ? { image: shareImage(images[0].url) } : {}),
    ...(artwork.description || artwork.story ? { description: plainText(artwork.description || artwork.story, 300) } : {}),
    ...(artwork.medium ? { artMedium: artwork.medium } : {}),
    ...(artwork.year ? { dateCreated: String(artwork.year) } : {}),
    ...(artwork.width_cm ? { width: dimensionValue(artwork.width_cm) } : {}),
    ...(artwork.height_cm ? { height: dimensionValue(artwork.height_cm) } : {}),
    ...(artwork.depth_cm ? { depth: dimensionValue(artwork.depth_cm) } : {}),
  };

  return (
    <main className="container pb-20 pt-10 md:pb-28 md:pt-14">
      <JsonLd data={artworkSchema} />
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

      {linkedProducts.length > 0 && (
        <section className="mt-20 border-t border-[#e8e5de] pt-12">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">{onlyPrints ? "Prints of this work" : "More ways to collect"}</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">{onlyPrints ? "Collect this work as a print." : "Take this work home."}</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#77736d]">{onlyPrints ? "Open the listing to choose from the available formats and see their prices." : "Explore available editions and objects created from this original work."}</p>
          </div>
          <div className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {linkedProducts.map((product) => (
              <Link key={product.id} href={`/shop/${product.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e2d9]">
                  {product.image ? (
                    <Image src={product.image} alt={product.imageAlt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-6 transition duration-500 group-hover:scale-[1.025]" />
                  ) : images[0]?.url ? (
                    <Image src={images[0].url} alt={images[0].alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-6 transition duration-500 group-hover:scale-[1.025]" />
                  ) : null}
                </div>
                <p className="eyebrow mt-4">{PRODUCT_TYPE_LABELS[product.product_type] || "Studio product"}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <h3 className="display text-2xl">{product.title}</h3>
                  <span className="text-xs text-[#77736d]">{product.priceLabel}</span>
                </div>
                <span className="mt-3 inline-block border-b border-[#c9c5bc] pb-1 text-[9px] uppercase tracking-[.14em] transition-colors group-hover:border-[#9c8062] group-hover:text-[#9c8062]">{PRINT_TYPES.includes(product.product_type) ? "Choose a format ↗" : "View details ↗"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

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
