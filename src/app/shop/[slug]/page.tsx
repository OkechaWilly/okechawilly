import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtworkImageGallery } from "@/components/artwork-image-gallery";
import ProductVariantPicker from "@/components/product-variant-picker";
import { PRODUCT_TYPE_LABELS, availability, availableVariants, isCurrentlyAvailable } from "@/lib/shop";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, absoluteUrl, pageMetadata, plainText, shareImage } from "@/lib/site";
import { byPrimaryThenOrder } from "@/lib/media";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from("products")
    .select("*, product_images(*), product_variants(*), artwork:artworks(title, artwork_images(*))")
    .eq("slug", slug).eq("is_published", true).in("status", ["active", "sold_out"]).single();
  if (!product) return {};
  const productCover = [...(product.product_images || [])].sort(byPrimaryThenOrder)[0];
  const linkedArtwork = Array.isArray(product.artwork) ? product.artwork[0] : product.artwork;
  const artworkCover = [...(linkedArtwork?.artwork_images || [])].sort(byPrimaryThenOrder)[0];
  const coverUrl = productCover
    ? supabase.storage.from("product-images").getPublicUrl(productCover.storage_path).data.publicUrl
    : artworkCover
      ? supabase.storage.from("artwork-images").getPublicUrl(artworkCover.storage_path).data.publicUrl
      : undefined;
  return pageMetadata({
    title: product.title,
    description: plainText(product.description) || `${PRODUCT_TYPE_LABELS[product.product_type] || "Studio product"} by ${SITE_NAME}.`,
    path: `/shop/${product.slug}`,
    image: shareImage(coverUrl),
    imageAlt: productCover?.alt_text || artworkCover?.alt_text || product.title,
  });
}

export default async function ShopProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from("products")
    .select("*, product_images(*), product_variants(*), artwork:artworks(title, artwork_images(*))")
    .eq("slug", slug).eq("is_published", true).in("status", ["active", "sold_out"]).single();

  if (!product) notFound();

  const productImages = [...(product.product_images || [])].sort((a, b) =>
    Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  const linkedArtwork = Array.isArray(product.artwork) ? product.artwork[0] : product.artwork;
  const artworkImages = [...(linkedArtwork?.artwork_images || [])].sort((a, b) =>
    Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  const seenPaths = new Set<string>();
  const imageUrls = [
    ...productImages.map((image) => ({
      path: image.storage_path,
      bucket: "product-images",
      alt: image.alt_text || product.title,
    })),
    ...artworkImages.map((image) => ({
      path: image.storage_path,
      bucket: "artwork-images",
      alt: image.alt_text || linkedArtwork?.title || product.title,
    })),
  ].filter((image) => {
    if (seenPaths.has(image.path)) return false;
    seenPaths.add(image.path);
    return true;
  }).map((image) => ({
    url: supabase.storage.from(image.bucket).getPublicUrl(image.path).data.publicUrl,
    alt: image.alt,
  }));

  // Structured data so Google can show the price and availability of this product.
  const onOffer = availableVariants(product);
  const offerPrices = onOffer.map((variant) => Number(variant.price));
  const offerCurrency = onOffer[0]?.currency || product.currency || "UGX";
  const productUrl = absoluteUrl(`/shop/${product.slug}`);
  // A sold or unavailable product must never be reported to Google as "in stock", even when its
  // formats are still switched on.
  const unavailable = availability(product) !== null;
  const offers = unavailable
    ? product.price != null
      ? { "@type": "Offer", priceCurrency: product.currency || "UGX", price: Number(product.price), availability: "https://schema.org/OutOfStock", url: productUrl }
      : undefined
    : onOffer.length > 1 && Math.min(...offerPrices) !== Math.max(...offerPrices)
    ? { "@type": "AggregateOffer", priceCurrency: offerCurrency, lowPrice: Math.min(...offerPrices), highPrice: Math.max(...offerPrices), offerCount: onOffer.length, availability: "https://schema.org/InStock", url: productUrl }
    : onOffer.length > 0
      ? { "@type": "Offer", priceCurrency: offerCurrency, price: offerPrices[0], availability: "https://schema.org/InStock", url: productUrl }
      : product.price != null
        ? { "@type": "Offer", priceCurrency: product.currency || "UGX", price: Number(product.price), availability: isCurrentlyAvailable(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: productUrl }
        : undefined;
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    url: productUrl,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: PRODUCT_TYPE_LABELS[product.product_type] || "Studio product",
    ...(product.description ? { description: plainText(product.description, 300) } : {}),
    ...(imageUrls.length ? { image: imageUrls.slice(0, 4).map((image) => shareImage(image.url)) } : {}),
    ...(offers ? { offers } : {}),
  };

  return (
    <main className="container py-14 md:py-20">
      <JsonLd data={productSchema} />
      <Link href="/shop" className="eyebrow">← Back to shop</Link>
      <div className="mt-10 grid gap-12 md:grid-cols-[1.1fr_.9fr]">
        <div>
          <ArtworkImageGallery images={imageUrls} title={product.title} />
        </div>
        <div className="pt-2 md:sticky md:top-24 md:self-start">
          <p className="eyebrow">{PRODUCT_TYPE_LABELS[product.product_type] || "Studio product"}</p>
          <h1 className="display mt-4 text-5xl md:text-6xl">{product.title}</h1>
          {availability(product) && <p className="mt-5 inline-flex border border-[#d9d4ca] px-4 py-3 text-[10px] uppercase tracking-[.15em] text-[#77736d]">{availability(product)?.label} · Enquiries welcome</p>}
          <ProductVariantPicker productTitle={product.title} variants={(product.product_variants || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)} fallbackPrice={product.price == null ? null : Number(product.price)} fallbackCurrency={product.currency || "UGX"} isSoldOut={!isCurrentlyAvailable(product)} />
          {product.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#77736d]">{product.description}</p>}
          {(product.medium || product.materials || product.dimensions || product.framing) && <div className="mt-8 border-t border-[#e8e5de] pt-5"><p className="eyebrow mb-3">Product details</p><dl className="divide-y divide-[#e8e5de] text-sm">
            {product.medium && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Medium</dt><dd className="text-right">{product.medium}</dd></div>}
            {product.materials && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Materials</dt><dd className="text-right">{product.materials}</dd></div>}
            {product.dimensions && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Dimensions</dt><dd className="text-right">{product.dimensions}</dd></div>}
            {product.framing && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Framing</dt><dd className="text-right">{product.framing}</dd></div>}
          </dl></div>}
          {product.shipping_information && <div className="mt-7 border-t border-[#e8e5de] pt-5"><p className="eyebrow">Shipping & delivery</p><p className="mt-3 whitespace-pre-line text-xs leading-6 text-[#77736d]">{product.shipping_information}</p></div>}
          <div className="my-9 border-y border-[#e8e5de] py-5 text-sm">
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Edition</span><span>{product.edition_size} copies</span></div>}
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Remaining</span><span>{Math.max(0, product.edition_size - product.edition_sold)}</span></div>}
            {product.track_inventory && product.stock_quantity != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Availability</span><span>{product.stock_quantity > 0 ? "Available" : "Out of stock"}</span></div>}
            {Array.isArray(product.options) && product.options.length > 0 && <div className="flex justify-between gap-5 py-2"><span className="text-[#77736d]">Options</span><span className="text-right">{product.options.join(", ")}</span></div>}
          </div>
          <div className="border-t border-[#e8e5de] pt-5"><p className="eyebrow">Purchasing this work</p><p className="mt-3 text-xs leading-6 text-[#77736d]">To purchase this work or confirm delivery options, contact the studio. I will personally confirm availability, delivery and the next steps. Online checkout is not yet available.</p></div>
        </div>
      </div>
    </main>
  );
}
