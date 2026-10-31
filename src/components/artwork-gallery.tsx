"use client";

import { useMemo, useState } from "react";
import { ArtworkCard } from "@/components/artwork-card";

export type PublicArtwork = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  medium: string | null;
  category: string | null;
  status: string;
  description: string | null;
  story: string | null;
  artwork_images: { id: string; storage_path: string; alt_text: string | null; is_primary: boolean; sort_order: number }[];
  image: string;
};

export function ArtworkGallery({ artworks }: { artworks: PublicArtwork[] }) {
  const [activeCategory, setActiveCategory] = useState("All works");
  const categories = useMemo(
    () => ["All works", ...Array.from(new Set(artworks.map((artwork) => artwork.category).filter((value): value is string => Boolean(value))))],
    [artworks],
  );
  const visibleArtworks = useMemo(
    () => activeCategory === "All works" ? artworks : artworks.filter((artwork) => artwork.category === activeCategory),
    [activeCategory, artworks],
  );

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-b border-[#e7e3dc] pb-5">
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
            className={`text-[10px] uppercase tracking-[.14em] transition-colors ${activeCategory === category ? "text-[#9c8062]" : "text-[#77736d] hover:text-[#242320]"}`}>
            {category}
          </button>
        ))}
      </div>
      {visibleArtworks.length ? (
        <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArtworks.map((artwork) => (
            <ArtworkCard key={artwork.id} item={{
              slug: artwork.slug,
              title: artwork.title,
              year: artwork.year?.toString() ?? "Undated",
              medium: artwork.medium ?? "Medium not specified",
              image: artwork.image,
              status: artwork.status.replaceAll("_", " "),
            }} />
          ))}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-[#cfcac0] px-6 py-16 text-center">
          <p className="display text-3xl">The collection is taking shape.</p>
          <p className="mt-3 text-xs leading-6 text-[#89847c]">New works will appear here as they are added to the public archive.</p>
        </div>
      )}
      <p className="mt-8 text-[10px] text-[#77736d]">Showing {visibleArtworks.length} {visibleArtworks.length === 1 ? "work" : "works"}.</p>
    </>
  );
}
