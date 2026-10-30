"use client";

import { useMemo, useState } from "react";
import { artworks } from "@/data/site";
import { ArtworkCard } from "@/components/artwork-card";

const categories = [
  "All works",
  ...Array.from(new Set(artworks.map((artwork) => artwork.category))),
];

export function ArtworkGallery() {
  const [activeCategory, setActiveCategory] = useState("All works");
  const visibleArtworks = useMemo(
    () =>
      activeCategory === "All works"
        ? artworks
        : artworks.filter((artwork) => artwork.category === activeCategory),
    [activeCategory],
  );

  return (
    <>
      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-b border-[#e7e3dc] pb-5">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            aria-pressed={activeCategory === category}
            className={`text-[10px] uppercase tracking-[.14em] transition-colors ${
              activeCategory === category
                ? "text-[#9c8062]"
                : "text-[#77736d] hover:text-[#242320]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {visibleArtworks.map((artwork) => (
          <ArtworkCard key={artwork.slug} item={artwork} />
        ))}
      </div>
      <p className="mt-8 text-[10px] text-[#77736d]">
        Showing {visibleArtworks.length} {visibleArtworks.length === 1 ? "work" : "works"}.
      </p>
    </>
  );
}
