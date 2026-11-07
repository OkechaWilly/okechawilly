import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ShopPageBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: string;
  backHref?: string;
  backLabel?: string;
};

export default async function ShopPageBanner({
  eyebrow,
  title,
  description,
  aside,
  backHref,
  backLabel = "Back to the shop",
}: ShopPageBannerProps) {
  const supabase = await createClient();
  const { data: artworks } = await supabase
    .from("artworks")
    .select("title, is_featured, artwork_images(storage_path, is_primary, sort_order)")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(20);

  const featured = (artworks || [])
    .map((artwork) => {
      const images = [...(artwork.artwork_images || [])].sort(
        (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order
      );
      return images[0] ? {
        title: artwork.title,
        url: supabase.storage.from("artwork-images").getPublicUrl(images[0].storage_path).data.publicUrl,
      } : null;
    })
    .filter(Boolean);
  const featured = artworks?.find((artwork: any) => artwork && (artwork as any).is_featured) || artworks?.[0];

  return (
    <section className="relative isolate flex min-h-[320px] items-center overflow-hidden bg-[#242320] md:min-h-[350px]">
      {featured?.url && (
        <Image
          src={featured.url}
          alt={featured.title}
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-20 object-cover object-center"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#171614]/90 via-[#171614]/70 to-[#171614]/35" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#171614]/35 via-transparent to-[#171614]/20" />
      <div className="container relative py-12 text-[#f7f6f2] md:py-14">
        {backHref && (
          <Link href={backHref} className="eyebrow inline-flex text-[#f7f6f2]/75 transition-colors hover:text-white">
            ← {backLabel}
          </Link>
        )}
        <p className={`eyebrow ${backHref ? "mt-7" : ""} text-[#e0c8ad]`}>{eyebrow}</p>
        <h1 className="display mt-3 text-5xl leading-[1.02] md:text-7xl lg:text-8xl">
          {title}<span className="text-[#d0aa83]">.</span>
        </h1>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <p className="max-w-2xl text-sm leading-7 text-white/80 md:text-base">{description}</p>
          {aside && <p className="text-[10px] leading-6 text-white/75 md:text-right">{aside}</p>}
        </div>
      </div>
    </section>
  );
}
