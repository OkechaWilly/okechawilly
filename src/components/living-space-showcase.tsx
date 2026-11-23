"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type LivingSpacePhoto = {
  id: string;
  title: string;
  caption: string | null;
  location: string | null;
  alt_text: string;
  image_url: string;
};

const fallbackImage = "https://afxbvymvsqeekmznsalo.supabase.co/storage/v1/object/public/artwork-images/826c77b6-8fc1-4ccf-84bd-9f0a4bfcfb10/4978d3da-914b-4849-8a2a-5b35517237e2.jpg";

export default function LivingSpaceShowcase({ photos }: { photos: LivingSpacePhoto[] }) {
  const [active, setActive] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const hasPhotos = photos.length > 0;
  const current = hasPhotos ? photos[active] : null;

  useEffect(() => {
    if (photos.length < 2) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setImageReady(false);
      setActive(index => (index + 1) % photos.length);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  return (
    <aside
      className="relative min-h-[560px] overflow-hidden bg-[#292824] lg:min-h-0"
      aria-label="Photographs of people with Okecha Willy's artwork"
      aria-roledescription="carousel"
    >
      <Image
        key={current?.id ?? "archive-fallback"}
        src={current?.image_url ?? fallbackImage}
        alt={current?.alt_text ?? "The Ports, an original artwork by Okecha Willy"}
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        onLoad={() => setImageReady(true)}
        className={`object-cover transition-opacity duration-1000 ease-in-out ${imageReady ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/5" aria-hidden="true" />

      <div className="absolute bottom-0 left-0 right-0 px-7 pb-10 pt-24 text-white sm:px-10 sm:pb-12">
        <p className="text-[9px] uppercase tracking-[.22em] text-white/75">
          {hasPhotos ? "Moments with the work" : "From the studio archive"}
        </p>
        <div className="mt-2 flex items-end justify-between gap-5">
          <div className="min-w-0">
            <h2 className="serif text-2xl sm:text-3xl">
              {current?.title ?? "Art, shared."}
            </h2>
            {current?.caption && (
              <p className="mt-1 max-w-md text-xs leading-5 text-white/80">{current.caption}</p>
            )}
            {current?.location && (
              <p className="mt-2 text-[9px] uppercase tracking-[.16em] text-white/65">{current.location}</p>
            )}
            {!hasPhotos && (
              <p className="mt-2 max-w-md text-xs leading-5 text-white/80">
                Photographs of original works finding their place in the world will appear here.
              </p>
            )}
          </div>
          {photos.length > 1 && (
            <span className="shrink-0 pb-1 text-[9px] tabular-nums tracking-[.16em] text-white/70">
              {String(active + 1).padStart(2, "0")} <span className="px-1 text-white/40">/</span> {String(photos.length).padStart(2, "0")}
            </span>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-6 h-px w-full overflow-hidden bg-white/30" aria-hidden="true">
            <div
              key={active}
              className="living-space-progress-fill h-full origin-left bg-white/90"
              style={{ animation: "living-space-progress 6.8s linear forwards" }}
            />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes living-space-progress {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .living-space-progress-fill { animation: none !important; }
        }
      `}</style>
    </aside>
  );
}
