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

type StatusFilter = "all" | "available" | "sold";

export function ArtworkGallery({ artworks }: { artworks: PublicArtwork[] }) {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [activeCategory, setActiveCategory] = useState("All categories");

  const statusArtworks = useMemo(() => artworks.filter((artwork) => {
    const status = artwork.status.trim().toLowerCase().replaceAll("_", " ");
    if (activeStatus === "available") return status === "available";
    if (activeStatus === "sold") return status === "sold";
    return true;
  }), [activeStatus, artworks]);

  const categories = useMemo(
    () => [
      "All categories",
      ...Array.from(new Set(
        statusArtworks.map((artwork) => artwork.category?.trim())
          .filter((value): value is string => Boolean(value)),
      )),
    ],
    [statusArtworks],
  );

  const visibleArtworks = useMemo(
    () => activeCategory === "All categories"
      ? statusArtworks
      : statusArtworks.filter((artwork) => artwork.category?.trim() === activeCategory),
    [activeCategory, statusArtworks],
  );

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All works" },
    { value: "available", label: "Available" },
    { value: "sold", label: "Sold archive" },
  ];

  return (
    <>
      <div className="mt-12 border-y border-[#e7e3dc] py-5">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2" aria-label="Filter artwork by availability">
              {statusOptions.map((option) => {
                const count = option.value === "all"
                  ? artworks.length
                  : artworks.filter((artwork) => artwork.status.trim().toLowerCase().replaceAll("_", " ") === option.value).length;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setActiveStatus(option.value); setActiveCategory("All categories"); }}
                    aria-pressed={activeStatus === option.value}
                    className={`border px-4 py-2.5 text-[10px] uppercase tracking-[.12em] transition-colors ${
                      activeStatus === option.value
                        ? "border-[#242320] bg-[#242320] text-[#f7f6f2]"
                        : "border-[#d9d5cc] text-[#77736d] hover:border-[#9c8062] hover:text-[#242320]"
                    }`}
                  >
                    {option.label}<span className="ml-2 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] uppercase tracking-[.13em] text-[#8a857c]" aria-live="polite">
              {visibleArtworks.length} {visibleArtworks.length === 1 ? "work" : "works"}
            </p>
          </div>

          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 border-t border-[#eeeae3] pt-4" aria-label="Filter artwork by category">
              {categories.map((category) => {
                const count = category === "All categories"
                  ? statusArtworks.length
                  : statusArtworks.filter((artwork) => artwork.category?.trim() === category).length;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    aria-pressed={activeCategory === category}
                    className={`rounded-full border px-3 py-2 text-[9px] uppercase tracking-[.11em] transition-colors ${
                      activeCategory === category
                        ? "border-[#c9b59e] bg-[#eee9e1] text-[#514b43]"
                        : "border-transparent text-[#8a857c] hover:border-[#d9d5cc] hover:text-[#242320]"
                    }`}
                  >
                    {category}<span className="ml-2 opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {visibleArtworks.length ? (
        <div className="mt-10 grid gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {visibleArtworks.map((artwork) => {
            const primaryImage = [...artwork.artwork_images].sort(
              (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
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
          <p className="eyebrow">{activeStatus === "sold" ? "Sold archive" : "The portfolio"}</p>
          <p className="display mt-4 text-3xl">
            {activeStatus === "sold"
              ? "No sold works in the archive yet."
              : activeStatus === "available"
                ? "No available works at the moment."
                : "The collection is taking shape."}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-6 text-[#89847c]">
            {activeStatus === "sold"
              ? "Works marked as sold will remain here as part of the artist’s public portfolio."
              : activeStatus === "available"
                ? "Check back as new works become available."
                : "Published artworks will appear here as they are added to the public archive."}
          </p>
          {(activeStatus !== "all" || activeCategory !== "All categories") && (
            <button
              type="button"
              onClick={() => { setActiveStatus("all"); setActiveCategory("All categories"); }}
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
