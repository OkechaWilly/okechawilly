import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const categories = [
  { value: "original", title: "Original paintings" },
  { value: "limited_print", title: "Limited-edition prints" },
  { value: "open_print", title: "Open-edition prints" },
  { value: "merchandise", title: "Objects & merchandise" },
  { value: "art_object", title: "Art objects" },
];

function formatPrice(price: number | null, currency: string) {
  if (price == null) return "Price on request";
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency", currency: currency || "UGX", maximumFractionDigits: 0,
    }).format(Number(price));
  } catch {
    return `${currency} ${Number(price).toLocaleString("en-UG")}`;
  }
}

export default async function Shop() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, slug, product_type, description, price, currency, edition_size, edition_sold, stock_quantity, track_inventory, status, product_images(*)")
    .eq("is_published", true)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const products = (data || []).map((product) => {
    const images = [...(product.product_images || [])].sort((a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
    );
    const cover = images[0];
    return {
      ...product,
      imageUrl: cover ? supabase.storage.from("product-images").getPublicUrl(cover.storage_path).data.publicUrl : null,
      imageAlt: cover?.alt_text || product.title,
    };
  });

  const available = products.filter((product) => {
    if (product.status === "sold_out") return false;
    if (product.product_type === "limited_print" && product.edition_size != null && product.edition_sold >= product.edition_size) return false;
    if (product.track_inventory && product.stock_quantity === 0) return false;
    return true;
  });

  return (
    <main>
      <section className="container py-20 md:py-28">
        <p className="eyebrow">Collect art</p>
        <h1 className="display mt-4 text-6xl md:text-8xl">The shop<span className="text-[#9c8062]">.</span></h1>
        <div className="mt-7 grid gap-8 md:grid-cols-[1fr_.7fr] md:items-end">
          <p className="max-w-2xl text-base leading-8 text-[#77736d]">
            A growing selection of original paintings, fine art prints and objects.
            Each piece is presented with its story and details. To purchase or ask
            about delivery, get in touch directly.
          </p>
          <p className="text-xs leading-6 text-[#77736d] md:justify-self-end md:text-right">
            Based in Uganda<br />Enquiries welcome from collectors worldwide
          </p>
        </div>
      </section>

      {available.length > 0 ? (
        <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
          <div className="container py-16 md:py-20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div><p className="eyebrow">Available now</p><h2 className="display mt-3 text-4xl md:text-5xl">Selected works.</h2></div>
              <p className="max-w-sm text-sm leading-7 text-[#77736d]">Browse works currently listed by the studio. Availability is confirmed personally before any sale.</p>
            </div>
            <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((product) => (
                <article key={product.id}>
                  <Link href={`/shop/${product.slug}`} className="group block">
                    <div className="aspect-[4/5] overflow-hidden bg-[#e6e2da]">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.imageAlt} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[#89847c]">Image coming soon</div>}
                    </div>
                    <p className="eyebrow mt-5">{categories.find((category) => category.value === product.product_type)?.title || "Artwork"}</p>
                    <h3 className="display mt-2 text-2xl">{product.title}</h3>
                  </Link>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#77736d]">
                    <span>{formatPrice(product.price, product.currency)}</span>
                    {product.product_type === "limited_print" && product.edition_size != null && <span>{Math.max(0, product.edition_size - product.edition_sold)} remaining</span>}
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
