import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

const typeLabels: Record<string, string> = {
  original: "Original painting", limited_print: "Limited-edition print",
  open_print: "Open-edition print", merchandise: "Objects & merchandise", art_object: "Art object",
};

export default async function ShopProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from("products")
    .select("*, product_images(*)")
    .eq("slug", slug).eq("is_published", true).eq("status", "active").single();

  if (!product) notFound();
  if (product.track_inventory && product.stock_quantity === 0) notFound();
  if (product.product_type === "limited_print" && product.edition_size != null && product.edition_sold >= product.edition_size) notFound();

  const images = [...(product.product_images || [])].sort((a, b) =>
    Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
  );
  const imageUrls = images.map((image) => ({
    url: supabase.storage.from("product-images").getPublicUrl(image.storage_path).data.publicUrl,
    alt: image.alt_text || product.title,
  }));
  const price = product.price == null ? "Price on request" : new Intl.NumberFormat("en-UG", {
    style: "currency", currency: product.currency || "UGX", maximumFractionDigits: 0,
  }).format(Number(product.price));

  return (
    <main className="container py-14 md:py-20">
      <Link href="/shop" className="eyebrow">← Back to shop</Link>
      <div className="mt-10 grid gap-12 md:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          {imageUrls.length ? imageUrls.map((image, index) => (
            <div key={index} className="overflow-hidden bg-[#e8e4dc]"><img src={image.url} alt={image.alt} className="h-auto w-full" /></div>
          )) : <div className="flex aspect-[4/5] items-center justify-center bg-[#e8e4dc] text-xs uppercase tracking-widest text-[#89847c]">Product photograph coming soon</div>}
        </div>
        <div className="pt-5">
          <p className="eyebrow">{typeLabels[product.product_type] || "Studio product"}</p>
          <h1 className="display mt-4 text-5xl md:text-6xl">{product.title}</h1>
          <p className="mt-5 text-lg">{price}</p>
          {product.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-[#77736d]">{product.description}</p>}
          <div className="my-9 border-y border-[#e8e5de] py-5 text-sm">
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Edition</span><span>{product.edition_size} copies</span></div>}
            {product.product_type === "limited_print" && product.edition_size != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Remaining</span><span>{Math.max(0, product.edition_size - product.edition_sold)}</span></div>}
            {product.track_inventory && product.stock_quantity != null && <div className="flex justify-between py-2"><span className="text-[#77736d]">Availability</span><span>{product.stock_quantity > 0 ? "Available" : "Out of stock"}</span></div>}
            {Array.isArray(product.options) && product.options.length > 0 && <div className="flex justify-between gap-5 py-2"><span className="text-[#77736d]">Options</span><span className="text-right">{product.options.join(", ")}</span></div>}
          </div>
          <p className="text-xs leading-6 text-[#77736d]">To purchase this work or confirm delivery options, contact the studio. Online checkout is not yet available.</p>
          <Link href={`/contact?subject=${encodeURIComponent(`Enquiry about ${product.title}`)}`} className="mt-7 inline-block bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white">Enquire about this product ↗</Link>
        </div>
      </div>
    </main>
  );
}
