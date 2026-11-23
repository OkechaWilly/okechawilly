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
  const [paused, setPaused] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const hasPhotos = photos.length > 0;
  const current = hasPhotos ? photos[active] : null;

  useEffect(() => {
    if (paused || photos.length < 2) return;
    const timer = window.setInterval(() => {
      setImageReady(false);
      setActive(index => (index + 1) % photos.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, photos.length]);

  function move(direction: number) {
    if (!photos.length) return;
    setImageReady(false);
    setActive(index => (index + direction + photos.length) % photos.length);
    setPaused(true);
  }

  return (
    <aside
      className="relative min-h-[560px] overflow-hidden bg-[#292824] lg:min-h-0"
      aria-label="Art in living spaces"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Image
        key={current?.id ?? "archive-fallback"}
        src={current?.image_url ?? fallbackImage}
        alt={current?.alt_text ?? "The Ports, an original artwork by Okecha Willy"}
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        onLoad={() => setImageReady(true)}
        className={`object-cover transition-opacity duration-700 ${imageReady ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-black/25" aria-hidden="true" />
      <div className="absolute left-7 right-7 top-7 flex items-center justify-between text-[10px] uppercase tracking-[.18em] text-white/85 sm:left-10 sm:right-10 sm:top-10">
        <span>Okecha Willy · Art in living spaces</span>
        <span>{hasPhotos ? `${String(active + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}` : "Studio archive"}</span>
      </div>
      <div className="absolute bottom-8 left-7 right-7 text-white sm:bottom-10 sm:left-10 sm:right-10">
        <p className="text-[10px] uppercase tracking-[.2em] text-white/75">
          {hasPhotos ? "Artwork in a collector's space" : "A glimpse from the studio"}
        </p>
        <h2 className="serif mt-2 text-3xl sm:text-4xl">
          {current?.title ?? "Art belongs in your space."}
        </h2>
        <p className="mt-2 max-w-md text-xs leading-6 text-white/80">
          {current?.caption ?? (hasPhotos ? "" : "Photographs of original works in their new homes will appear here as the collection grows.")}
        </p>
        <div className="mt-5 flex min-h-10 items-center justify-between border-t border-white/35 pt-3">
          <span className="text-[10px] uppercase tracking-[.16em] text-white/75">
            {current?.location ?? (hasPhotos ? "Okecha Willy" : "Wakiso, Uganda")}
          </span>
          {photos.length > 1 && (
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => move(-1)} aria-label="Previous photograph" className="text-xs text-white/85 transition hover:text-white">← PREVIOUS</button>
              <button type="button" onClick={() => move(1)} aria-label="Next photograph" className="text-xs text-white/85 transition hover:text-white">NEXT →</button>
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="mt-4 flex gap-2" aria-label="Choose photograph">
            {photos.map((photo, index) => (
              <button key={photo.id} type="button" onClick={() => { setImageReady(false); setActive(index); setPaused(true); }}
                aria-label={`Show photograph ${index + 1}`} aria-current={index === active}
                className={`h-1 flex-1 transition-colors ${index === active ? "bg-white" : "bg-white/35 hover:bg-white/65"}`} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
