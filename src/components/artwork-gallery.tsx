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
    () => [
      "All works",
      ...Array.from(
        new Set(
          artworks
            .map((artwork) => artwork.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    ],
    [artworks],
  );

  const visibleArtworks = useMemo(
    () =>
      activeCategory === "All works"
        ? artworks
        : artworks.filter((artwork) => artwork.category?.trim() === activeCategory),
    [activeCategory, artworks],
  );

  return (
    <>
      <div className="mt-12 border-y border-[#e7e3dc] py-5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex flex-wrap gap-2" aria-label="Filter artwork by category">
            {categories.map((category) => {
              const count =
                category === "All works"
                  ? artworks.length
                  : artworks.filter((artwork) => artwork.category?.trim() === category).length;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={`rounded-full border px-4 py-2.5 text-[10px] uppercase tracking-[.12em] transition-colors ${
                    activeCategory === category
                      ? "border-[#242320] bg-[#242320] text-[#f7f6f2]"
                      : "border-[#d9d5cc] text-[#77736d] hover:border-[#9c8062] hover:text-[#242320]"
                  }`}
                >
                  {category}
                  <span className="ml-2 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] uppercase tracking-[.13em] text-[#8a857c]" aria-live="polite">
            {visibleArtworks.length} {visibleArtworks.length === 1 ? "work" : "works"}
          </p>
        </div>
      </div>

      {visibleArtworks.length ? (
        <div className="mt-10 grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArtworks.map((artwork) => {
            const primaryImage = [...artwork.artwork_images].sort(
              (a, b) =>
                Number(b.is_primary) - Number(a.is_primary) ||
                a.sort_order - b.sort_order,
            )[0];

            return (
              <ArtworkCard
                key={artwork.id}
                item={{
                  slug: artwork.slug,
                  title: artwork.title,
                  year: artwork.year?.toString() ?? "Undated",
                  medium: artwork.medium ?? "Medium not specified",
                  image: artwork.image,
                  imageAlt: primaryImage?.alt_text || artwork.title,
                  status: artwork.status,
                  category: artwork.category,
                }}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-10 border border-dashed border-[#cfcac0] px-6 py-20 text-center">
          <p className="eyebrow">The portfolio</p>
          <p className="display mt-4 text-3xl">
            {activeCategory === "All works"
              ? "The collection is taking shape."
              : "More work is on the way."}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-6 text-[#89847c]">
            {activeCategory === "All works"
              ? "Published artworks will appear here as they are added to the public archive."
              : `There are no published works in “${activeCategory}” just yet. Explore the other categories in the meantime.`}
          </p>
          {activeCategory !== "All works" && (
            <button
              type="button"
              onClick={() => setActiveCategory("All works")}
              className="mt-6 border-b border-[#9c8062] pb-1 text-[10px] uppercase tracking-[.14em]"
            >
              View all works
            </button>
          )}
        </div>
      )}
    </>
  );
}
