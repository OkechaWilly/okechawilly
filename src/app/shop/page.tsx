import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import ShopPageBanner from "@/components/shop-page-banner";
import {
  PRODUCT_TYPE_LABELS,
  SHOP_CATEGORIES,
  categoryOfType,
  isCurrentlyAvailable,
  priceLabel,
} from "@/lib/shop";

function joinWithAnd(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ category?: string }> }): Promise<Metadata> {
  const { category } = await searchParams;
  const active = SHOP_CATEGORIES.find((item) => item.slug === category);
  return active
    ? pageMetadata({ title: active.title, description: `Available ${active.noun} from the studio of Okecha Willy.`, path: `/shop?category=${active.slug}` })
    : pageMetadata({
        title: "Shop",
        description: "Artwork and editions available from the studio of Okecha Willy. Enquiries welcome from collectors worldwide.",
        path: "/shop",
      });
}

export default async function Shop({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: requestedCategory } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, slug, product_type, description, price, currency, edition_size, edition_sold, stock_quantity, track_inventory, status, product_images(*), product_variants(price, currency, is_available, stock_quantity), artwork:artworks(title, artwork_images(*))")
    .eq("is_published", true)
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });

  const available = (data || []).map((product) => {
      const images = [...(product.product_images || [])].sort((a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
      );
      const linkedArtwork = Array.isArray(product.artwork) ? product.artwork[0] : product.artwork;
      const artworkImages = [...(linkedArtwork?.artwork_images || [])].sort((a, b) =>
        Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
      );
      const cover = images[0];
      const artworkCover = artworkImages[0];
      return {
        ...product,
        imageUrl: cover
          ? supabase.storage.from("product-images").getPublicUrl(cover.storage_path).data.publicUrl
          : artworkCover
            ? supabase.storage.from("artwork-images").getPublicUrl(artworkCover.storage_path).data.publicUrl
            : null,
        imageAlt: cover?.alt_text || artworkCover?.alt_text || product.title,
      };
    });

  // Categories are based on all published catalogue entries, including sold-out works.
  const presentCategories = SHOP_CATEGORIES.filter((category) =>
    available.some((product) => categoryOfType(product.product_type)?.slug === category.slug),
  );
  const activeCategory = presentCategories.find((category) => category.slug === requestedCategory);
  const visible = activeCategory
    ? available.filter((product) => categoryOfType(product.product_type)?.slug === activeCategory.slug)
    : available;
  // A filter is only useful when there is more than one kind of thing to filter.
  const showFilter = presentCategories.length > 1;
  const hasPrints = available.some((product) => categoryOfType(product.product_type)?.slug === "prints");

  const intro = presentCategories.length
    ? `A growing selection of ${joinWithAnd(presentCategories.map((category) => category.noun))}.`
    : "A growing selection of work from the studio.";

  return (
    <main>
      <ShopPageBanner
        eyebrow="Collect art"
        title="The shop"
        description={`${intro} Each piece is presented with its story and details. To purchase or ask about delivery, get in touch directly.`}
        aside={"Based in Uganda\nEnquiries welcome from collectors worldwide"}
      />

      {hasPrints && activeCategory?.slug !== "prints" && <section className="container -mt-6 pb-16 md:pb-20">
        <div className="flex flex-col gap-5 border border-[#e7e3dc] bg-[#f7f6f2] p-7 md:flex-row md:items-center md:justify-between md:p-9">
          <div>
            <p className="eyebrow">For print collectors</p>
            <h2 className="display mt-2 text-3xl md:text-4xl">Fine art prints.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#77736d]">Explore available limited and open-edition prints, with details on formats, materials and availability.</p>
          </div>
          <Link href="/prints" className="inline-flex shrink-0 items-center self-start border border-[#242320] px-6 py-4 text-[10px] uppercase tracking-[.15em] transition-colors hover:bg-[#242320] hover:!text-[#f7f6f2] md:self-center">Explore prints <span className="ml-5">↗</span></Link>
        </div>
      </section>}

      {available.length > 0 ? (
        <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
          <div className="container py-16 md:py-20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="eyebrow">Studio catalogue</p>
                <h2 className="display mt-3 text-4xl md:text-5xl">{activeCategory ? activeCategory.title : "Selected works"}.</h2>
              </div>
              <p className="max-w-sm text-sm leading-7 text-[#77736d]">Browse works currently listed by the studio. Availability is confirmed personally before any sale.</p>
            </div>

            {showFilter && (
              <nav aria-label="Filter the shop by category" className="mt-9 flex flex-wrap gap-2">
                {[{ slug: "", title: "All items" }, ...presentCategories].map((category) => {
                  const active = (activeCategory?.slug ?? "") === category.slug;
                  return (
                    <Link
                      key={category.slug || "all"}
                      href={category.slug ? `/shop?category=${category.slug}` : "/shop"}
                      scroll={false}
                      aria-current={active ? "page" : undefined}
                      className={`border px-5 py-3 text-[10px] uppercase tracking-[.14em] transition-colors ${active ? "border-[#242320] bg-[#242320] !text-[#f7f6f2]" : "border-[#d9d4ca] bg-[#f7f6f2] hover:border-[#9c8062] hover:!text-[#9c8062]"}`}
                    >
                      {category.title}
                    </Link>
                  );
                })}
              </nav>
            )}

            <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((product) => (
                <article key={product.id}>
                  <Link href={`/shop/${product.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e6e2da]">
                      {product.imageUrl ? <Image src={product.imageUrl} alt={product.imageAlt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-5 transition duration-500 group-hover:scale-[1.025] sm:p-7" /> : <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[#89847c]">Image coming soon</div>}
                    </div>
                    <p className="eyebrow mt-5">{PRODUCT_TYPE_LABELS[product.product_type] || "Artwork"}</p>
                    <h3 className="display mt-2 text-2xl">{product.title}</h3>
                    {!isCurrentlyAvailable(product) && <span className="mt-3 inline-flex border border-[#d9d4ca] px-3 py-2 text-[9px] uppercase tracking-[.14em] text-[#77736d]">Sold out</span>}
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#ded9d0] pt-3 text-xs text-[#77736d]">
                    <span>{priceLabel(product)}</span>
                    {!isCurrentlyAvailable(product) ? <span>Sold out</span> : product.product_type === "limited_print" && product.edition_size != null ? <span>{Math.max(0, product.edition_size - (product.edition_sold ?? 0))} remaining</span> : <Link href={`/shop/${product.slug}`} className="uppercase tracking-[.12em] !text-[#242320] transition-colors hover:!text-[#9c8062]">View details ↗</Link>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
          <div className="container py-16 md:py-20">
            <p className="eyebrow">The catalogue is growing</p>
            <h2 className="display mt-3 text-4xl md:text-5xl">New works coming soon.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">Products will appear here when they are marked active and published in the Studio. You can still enquire about a work directly.</p>
          </div>
        </section>
      )}

      <section className="container py-16 md:py-24">
        <div className="grid gap-8 md:grid-cols-[1fr_.8fr] md:items-end">
          <div><p className="eyebrow">Interested in collecting?</p><h2 className="display mt-4 max-w-xl text-4xl leading-tight md:text-5xl">Start a conversation about a work.</h2></div>
          <div><p className="text-sm leading-7 text-[#77736d]">For current availability, commissions, print enquiries or questions about shipping, get in touch. I can share details and discuss the best way to get a work to you.</p>
            <Link href="/contact" className="mt-7 inline-flex border border-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition-colors !text-[#242320] hover:bg-[#242320] hover:!text-[#f7f6f2]">Make an enquiry <span className="ml-5">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
