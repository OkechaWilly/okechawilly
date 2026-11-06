"use client";

import { useState } from "react";
import Image from "next/image";

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
          <Image
            src={active.url}
            alt={active.alt}
            width={0}
            height={0}
            sizes="(min-width: 768px) 55vw, 100vw"
            quality={85}
            priority
            className="h-auto max-h-[82vh] w-full object-contain"
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
                <Image src={image.url} alt={image.alt} fill sizes="120px" className="object-cover" />
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#171614]/95 p-5"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center border border-white/30 text-2xl text-white"
            aria-label="Close image viewer"
          >
            ×
          </button>
          <Image
            src={active.url}
            alt={active.alt}
            width={0}
            height={0}
            sizes="100vw"
            quality={85}
            className="h-auto max-h-[88vh] w-auto max-w-full object-contain"
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
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 text-xl text-white"
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
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/30 text-xl text-white"
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
