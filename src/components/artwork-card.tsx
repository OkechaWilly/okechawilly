import Link from "next/link";
import Image from "next/image";

type ArtworkCardItem = {
  slug: string;
  title: string;
  year: string;
  medium: string;
  image: string;
  imageAlt?: string;
  status: string;
  category?: string | null;
};

export function ArtworkCard({ item }: { item: ArtworkCardItem }) {
  const status = item.status.trim().toLowerCase().replaceAll("_", " ");
  const showStatus = status && status !== "available";

  return (
    <Link href={"/artwork/" + item.slug} className="group block">
      <div className="image-hover relative aspect-[4/5] overflow-hidden bg-[#e8e4dc]">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.imageAlt || item.title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <span className="serif text-2xl text-[#9c8062]">{item.title}</span>
          </div>
        )}
        {showStatus && (
          <span className="absolute left-3 top-3 bg-[#f7f6f2]/95 px-3 py-2 text-[9px] uppercase tracking-[.14em] text-[#514b43]">
            {status}
          </span>
        )}
        <span className="absolute bottom-3 right-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-[#f7f6f2] text-lg opacity-0 shadow-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          ↗
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 pt-4">
        <div className="min-w-0">
          {item.category && (
            <p className="eyebrow mb-2">{item.category}</p>
          )}
          <h3 className="serif text-[22px] leading-tight transition-colors group-hover:text-[#9c8062]">
            {item.title}
          </h3>
          <p className="mt-2 text-[11px] text-[#77736d]">
            {item.medium} <span className="px-1">·</span> {item.year}
          </p>
        </div>
      </div>
    </Link>
  );
}
