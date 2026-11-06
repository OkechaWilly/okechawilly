"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type FeaturedArtwork = {
  slug: string;
  title: string;
  year: string;
  medium: string;
  image: string;
  imageAlt: string;
  status: string;
  category: string | null;
};

export function FeaturedArtworkHero({ artworks }: { artworks: FeaturedArtwork[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const count = artworks.length;
  const activeArtwork = artworks[activeIndex];

  useEffect(() => {
    if (count < 2) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, 7000);
    return () => window.clearInterval(interval);
  }, [count]);

  if (!activeArtwork) {
    return (
      <section className="container grid items-center gap-12 pb-20 pt-12 md:min-h-[690px] md:grid-cols-[.88fr_1.12fr] md:gap-16 md:py-20">
        <div>
          <p className="eyebrow mb-7 flex items-center gap-3"><span className="inline-block h-px w-8 bg-[#9c8062]" />Independent artist · Uganda</p>
          <h1 className="display max-w-[620px] text-[clamp(58px,7vw,100px)]">Art that<br /><em className="text-[#9c8062]">holds</em> a story.</h1>
          <p className="mt-8 max-w-md text-[15px] leading-7 text-[#77736d]">Exploring identity, spirituality, culture and the human experience through painting and visual storytelling. A growing body of work shaped by observation, memory and curiosity.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/artwork" className="inline-flex items-center gap-5 bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition hover:bg-[#9c8062]">Explore artwork <span aria-hidden="true">↗</span></Link>
            <Link href="/about" className="inline-flex items-center border border-[#c9c5bc] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition hover:border-[#242320]">Meet the artist</Link>
          </div>
          <div className="mt-16 flex items-center gap-4"><span className="text-[10px] tracking-[.16em] text-[#9c8062]">01</span><span className="h-px w-10 bg-[#d9d4ca]" /><p className="text-[10px] uppercase tracking-[.16em] text-[#aaa49a]">A practice in progress</p></div>
        </div>
        <div className="relative ml-3 mr-3 aspect-[4/4.6] border border-[#d9d2c6] bg-[#e7e2d9] md:ml-0 md:mr-4" />
      </section>
    );
  }

  return (
    <section className="container grid items-center gap-12 pb-20 pt-12 md:min-h-[690px] md:grid-cols-[.88fr_1.12fr] md:gap-16 md:py-20">
      <div className="order-2 md:order-1">
        <p className="eyebrow mb-7 flex items-center gap-3"><span className="inline-block h-px w-8 bg-[#9c8062]" />Independent artist · Uganda</p>
        <h1 className="display max-w-[620px] text-[clamp(58px,7vw,100px)]">Art that<br /><em className="text-[#9c8062]">holds</em> a story.</h1>
        <p className="mt-8 max-w-md text-[15px] leading-7 text-[#77736d]">Exploring identity, spirituality, culture and the human experience through painting and visual storytelling. A growing body of work shaped by observation, memory and curiosity.</p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/artwork" className="inline-flex items-center gap-5 bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] !text-[#f7f6f2] transition hover:bg-[#9c8062]">Explore artwork <span aria-hidden="true">↗</span></Link>
          <Link href="/about" className="inline-flex items-center border border-[#c9c5bc] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition hover:border-[#242320]">Meet the artist</Link>
        </div>
        <div className="mt-16 flex items-center gap-4">
          <span className="text-[10px] tracking-[.16em] text-[#9c8062]">{String(activeIndex + 1).padStart(2, "0")}</span>
          <span className="h-px w-10 bg-[#d9d4ca]" />
          <p className="text-[10px] uppercase tracking-[.16em] text-[#aaa49a]">A practice in progress</p>
        </div>
      </div>
      <div className="order-1 md:order-2">
        <div className="relative ml-3 mr-3 md:ml-0 md:mr-4">
          <div className="absolute -right-3 -top-3 h-full w-full border border-[#d9d2c6]" />
          <div className="image-hover relative aspect-[4/4.6] overflow-hidden bg-[#e7e2d9]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeArtwork.slug}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.65, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {activeArtwork.image ? <Image src={activeArtwork.image} alt={activeArtwork.imageAlt || activeArtwork.title} fill priority={activeIndex === 0} sizes="(min-width: 768px) 45vw, 90vw" className="object-cover" /> : <div className="flex h-full items-center justify-center p-10 text-center"><p className="serif text-3xl text-[#9c8062]">A practice in progress</p></div>}
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={activeArtwork.slug} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -3 }} transition={{ duration: reduceMotion ? 0 : 0.3 }} className="absolute -bottom-5 -left-3 max-w-[85%] bg-[#f7f6f2] px-5 py-4 shadow-sm md:-left-6">
              <p className="eyebrow">Featured artwork</p>
              <Link href={"/artwork/" + activeArtwork.slug} className="serif mt-1 block text-xl hover:text-[#9c8062]">{activeArtwork.title}</Link>
            </motion.div>
          </AnimatePresence>
          <span className="absolute -bottom-10 right-0 text-[9px] uppercase tracking-[.16em] text-[#aaa49a]">Okecha Willy · Studio archive</span>
        </div>
        {count > 1 && (
          <div className="mt-16 flex items-center justify-end gap-2" aria-label="Featured artwork controls">
            {artworks.map((artwork, index) => (
              <button key={artwork.slug} type="button" onClick={() => setActiveIndex(index)} aria-label={"Show featured artwork " + (index + 1) + ": " + artwork.title} aria-current={index === activeIndex ? "true" : undefined} className={"h-1.5 rounded-full transition-all " + (index === activeIndex ? "w-7 bg-[#9c8062]" : "w-1.5 bg-[#c9c5bc] hover:bg-[#9c8062]")} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
