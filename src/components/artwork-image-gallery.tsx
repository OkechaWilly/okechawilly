"use client";

import { useState } from "react";

type ArtworkImage = { url: string; alt: string };

export function ArtworkImageGallery({
  images,
  title,
}: {
  images: ArtworkImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!images.length) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-[#e8e4dc] px-8 text-center">
        <p className="serif text-2xl text-[#9c8062]">Artwork photograph coming soon</p>
      </div>
    );
  }

  const active = images[activeIndex];

  return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group relative block w-full cursor-zoom-in overflow-hidden bg-[#e8e4dc] text-left"
          aria-label={`View larger image of ${title}`}
        >
          {/* The uploaded file is already resized before storage. Serve it directly
              so the artwork doesn't wait for a second image-optimisation pass. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="h-auto max-h-[92vh] w-full object-contain"
          />
          <span className="absolute bottom-4 right-4 bg-[#f7f6f2]/90 px-3 py-2 text-[9px] uppercase tracking-[.14em] opacity-0 transition group-hover:opacity-100">
            View image +
          </span>
        </button>

        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {images.map((image, index) => (
              <button
                type="button"
                key={image.url}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1} of ${title}`}
                aria-pressed={activeIndex === index}
                className={`relative aspect-square overflow-hidden border transition ${
                  activeIndex === index
                    ? "border-[#9c8062] p-1"
                    : "border-transparent opacity-65 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <p className="text-right text-[9px] uppercase tracking-[.14em] text-[#9b968d]">
          {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </p>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image viewer for ${title}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171614]/95 p-2 sm:p-3"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center border border-white/30 bg-[#171614]/40 text-2xl text-white"
            aria-label="Close image viewer"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.alt}
            loading="eager"
            decoding="async"
            className="h-auto max-h-[96vh] w-auto max-w-[96vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex - 1 + images.length) % images.length);
                }}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 bg-[#171614]/40 text-xl text-white sm:left-5"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveIndex((activeIndex + 1) % images.length);
                }}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 bg-[#171614]/40 text-xl text-white sm:right-5"
              >
                →
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
