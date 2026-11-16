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
import { cookies, headers } from "next/headers";


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const savedCurrency = cookieStore.get("okecha-willy-currency")?.value;
  const detectedCountry = (requestHeaders.get("x-vercel-ip-country") || "").toUpperCase();
  const marketCurrency: "UGX" | "USD" = savedCurrency === "UGX" || savedCurrency === "USD" ? savedCurrency : detectedCountry && detectedCountry !== "UG" ? "USD" : "UGX";
  const supabase = await createClient();
  const { data: product } = await supabase.from("products")
    .select("*, product_images(*), product_variants(*), artwork:artworks(title, slug, is_published, artwork_images(*))")
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
    .select("*, product_images(*), product_variants(*), artwork:artworks(title, slug, is_published, artwork_images(*))")
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
  const marketVariantPrices = onOffer
    .map((variant) => marketCurrency === "UGX"
      ? variant.price_ugx ?? (variant.currency === "UGX" ? variant.price : null)
      : variant.price_usd ?? (variant.currency === "USD" ? variant.price : null))
    .filter((price): price is number | string => price != null)
    .map(Number)
    .filter((price) => Number.isFinite(price) && price >= 0);
  const marketBasePrice = marketCurrency === "UGX"
    ? product.price_ugx ?? (product.currency === "UGX" ? product.price : null)
    : product.price_usd ?? (product.currency === "USD" ? product.price : null);
  const productUrl = absoluteUrl(`/shop/${product.slug}`);
  // Structured prices must match the visitor's selected market; never publish a USD
  // legacy price as UGX (or vice versa) in search results.
  const unavailable = availability(product) !== null;
  const offers = unavailable
    ? marketBasePrice != null
      ? { "@type": "Offer", priceCurrency: marketCurrency, price: Number(marketBasePrice), availability: "https://schema.org/OutOfStock", url: productUrl }
      : undefined
    : marketVariantPrices.length > 1 && Math.min(...marketVariantPrices) !== Math.max(...marketVariantPrices)
      ? { "@type": "AggregateOffer", priceCurrency: marketCurrency, lowPrice: Math.min(...marketVariantPrices), highPrice: Math.max(...marketVariantPrices), offerCount: marketVariantPrices.length, availability: "https://schema.org/InStock", url: productUrl }
      : marketVariantPrices.length > 0
        ? { "@type": "Offer", priceCurrency: marketCurrency, price: marketVariantPrices[0], availability: "https://schema.org/InStock", url: productUrl }
        : marketBasePrice != null
          ? { "@type": "Offer", priceCurrency: marketCurrency, price: Number(marketBasePrice), availability: "https://schema.org/InStock", url: productUrl }
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
          <ProductVariantPicker productId={product.id} productSlug={product.slug} productImage={imageUrls[0]?.url || null} productTitle={product.title} productType={product.product_type} variants={(product.product_variants || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)} fallbackPrice={product.price == null ? null : Number(product.price)} fallbackCurrency={product.currency || "UGX"} fallbackPriceUGX={product.price_ugx == null ? null : Number(product.price_ugx)} fallbackPriceUSD={product.price_usd == null ? null : Number(product.price_usd)} isSoldOut={!isCurrentlyAvailable(product)} />
          {product.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#77736d]">{product.description}</p>}
          {linkedArtwork?.is_published && linkedArtwork?.slug && <div className="mt-7 border-l border-[#c9b59e] pl-4"><p className="eyebrow">From the artwork archive</p><Link href={`/artwork/${linkedArtwork.slug}`} className="mt-2 inline-flex items-center gap-2 text-sm transition-colors hover:text-[#9c8062]">Explore the original artwork: {linkedArtwork.title} <span aria-hidden="true">↗</span></Link></div>}
          {(product.medium || product.materials || product.dimensions || product.framing) && <div className="mt-8 border-t border-[#e8e5de] pt-5"><p className="eyebrow mb-3">{product.product_type === "limited_print" || product.product_type === "open_print" ? "Print details" : "Product details"}</p><dl className="divide-y divide-[#e8e5de] text-sm">
            {product.medium && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Medium</dt><dd className="text-right">{product.medium}</dd></div>}
            {product.materials && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Materials</dt><dd className="text-right">{product.materials}</dd></div>}
            {product.dimensions && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Dimensions</dt><dd className="text-right">{product.dimensions}</dd></div>}
            {product.framing && <div className="flex justify-between gap-5 py-3"><dt className="text-[#77736d]">Framing</dt><dd className="text-right">{product.framing}</dd></div>}
          </dl></div>}
          {product.shipping_information && <div className="mt-7 border-t border-[#e8e5de] pt-5"><p className="eyebrow">Shipping & delivery</p><p className="mt-3 whitespace-pre-line text-xs leading-6 text-[#77736d]">{product.shipping_information}</p></div>}
          <div className="my-9 border-y border-[#e8e5de] py-5 text-sm">
            {(product.product_type === "limited_print" || product.product_type === "open_print") && <div className="flex justify-between gap-5 py-2"><span className="text-[#77736d]">Edition type</span><span>{product.product_type === "limited_print" ? "Limited edition" : "Open edition"}</span></div>}
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Edition size</span><span>{product.edition_size} copies</span></div>}
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Remaining</span><span>{Math.max(0, product.edition_size - product.edition_sold)}</span></div>}
            {product.track_inventory && product.stock_quantity != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Availability</span><span>{product.stock_quantity > 0 ? "Available" : "Out of stock"}</span></div>}
            {Array.isArray(product.options) && product.options.length > 0 && <div className="flex justify-between gap-5 py-2"><span className="text-[#77736d]">Options</span><span className="text-right">{product.options.join(", ")}</span></div>}
          </div>
          <div className="border-t border-[#e8e5de] pt-5"><p className="eyebrow">Delivery & payment</p><p className="mt-3 text-xs leading-6 text-[#77736d]">Delivery is calculated individually. The studio will confirm the delivery fee and full total with you before payment is requested.</p></div>
        </div>
      </div>
    </main>
  );
}
