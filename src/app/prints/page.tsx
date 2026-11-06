import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

const printTypes: Record<string, string> = {
  limited_print: "Limited-edition print",
  open_print: "Open-edition print",
};

function formatPrice(price: number | null, currency: string) {
  if (price == null) return "Price on request";
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: currency || "UGX",
      maximumFractionDigits: 0,
    }).format(Number(price));
  } catch {
    return `${currency} ${Number(price).toLocaleString("en-UG")}`;
  }
}

export default async function FineArtPrintsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, slug, product_type, description, price, currency, edition_size, edition_sold, stock_quantity, track_inventory, product_images(*)")
    .eq("is_published", true)
    .eq("status", "active")
    .in("product_type", ["limited_print", "open_print"])
    .order("created_at", { ascending: false });

  const prints = (data || []).filter((print) => {
    if (print.product_type === "limited_print" && print.edition_size != null && (print.edition_sold ?? 0) >= print.edition_size) return false;
    if (print.track_inventory && print.stock_quantity === 0) return false;
    return true;
  }).map((print) => {
    const images = [...(print.product_images || [])].sort((a, b) =>
      Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
    );
    const cover = images[0];
    return {
      ...print,
      imageUrl: cover ? supabase.storage.from("product-images").getPublicUrl(cover.storage_path).data.publicUrl : null,
      imageAlt: cover?.alt_text || print.title,
    };
  });

  return (
    <main>
      <section className="container py-20 md:py-28">
        <Link href="/shop" className="eyebrow transition-colors hover:text-[#9c8062]">← Back to the shop</Link>
        <p className="eyebrow mt-10">Collect the work</p>
        <h1 className="display mt-4 text-6xl md:text-8xl">Fine art prints<span className="text-[#9c8062]">.</span></h1>
        <div className="mt-7 grid gap-8 md:grid-cols-[1fr_.7fr] md:items-end">
          <p className="max-w-2xl text-base leading-8 text-[#77736d]">
            A selection of prints drawn from my original works. Each listing includes
            the available details on its format, materials and edition. For enquiries
            and delivery outside Uganda, please get in touch with the studio.
          </p>
          <p className="text-xs leading-6 text-[#77736d] md:justify-self-end md:text-right">
            Limited and open editions<br />Enquiries welcome worldwide
          </p>
        </div>
      </section>

      <section className="border-y border-[#e7e3dc] bg-[#f1efe9]">
        <div className="container py-16 md:py-20">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">The print collection</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">Works on paper.</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#77736d]">Availability and delivery arrangements are confirmed personally before any sale.</p>
          </div>

          {prints.length > 0 ? (
            <div className="mt-12 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {prints.map((print) => (
                <article key={print.id}>
                  <Link href={`/shop/${print.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e6e2da]">
                      {print.imageUrl ? (
                        <Image src={print.imageUrl} alt={print.imageAlt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain p-5 transition duration-500 group-hover:scale-[1.025] sm:p-7" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-[#89847c]">Image coming soon</div>
                      )}
                    </div>
                    <p className="eyebrow mt-5">{printTypes[print.product_type]}</p>
                    <h3 className="display mt-2 text-2xl">{print.title}</h3>
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#ded9d0] pt-3 text-xs text-[#77736d]">
                    <span>{formatPrice(print.price, print.currency)}</span>
                    {print.product_type === "limited_print" && print.edition_size != null ? (
                      <span>{Math.max(0, print.edition_size - (print.edition_sold ?? 0))} remaining</span>
                    ) : (
                      <Link href={`/shop/${print.slug}`} className="uppercase tracking-[.12em] !text-[#242320] transition-colors hover:!text-[#9c8062]">View details ↗</Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-12 border-t border-[#ded9d0] pt-10">
              <h3 className="display text-3xl md:text-4xl">The print collection is taking shape.</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">Prints will appear here as they become available. If there is a particular work you would like to see as a print, you are welcome to enquire with the studio.</p>
              <Link href="/contact?subject=Fine%20art%20print%20enquiry" className="mt-7 inline-flex border border-[#242320] px-6 py-4 text-[10px] uppercase tracking-[.15em] transition-colors hover:bg-[#242320] hover:!text-[#f7f6f2]">Ask about prints <span className="ml-5">↗</span></Link>
            </div>
          )}
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-8 md:grid-cols-[1fr_.8fr] md:items-end">
          <div>
            <p className="eyebrow">A note for collectors</p>
            <h2 className="display mt-4 max-w-xl text-4xl leading-tight md:text-5xl">Every print begins with an original.</h2>
          </div>
          <div>
            <p className="text-sm leading-7 text-[#77736d]">Print formats, paper or other materials, edition details and delivery options vary by work. Open an individual listing for its available information, or contact the studio before placing an order.</p>
            <Link href="/contact?subject=Fine%20art%20print%20enquiry" className="mt-7 inline-flex border border-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition-colors !text-[#242320] hover:bg-[#242320] hover:!text-[#f7f6f2]">Contact the studio <span className="ml-5">↗</span></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
