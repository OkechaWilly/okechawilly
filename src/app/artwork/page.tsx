import { ArtworkGallery } from "@/components/artwork-gallery";

export default function Artwork() {
  return (
    <main className="container py-20 md:py-24">
      <p className="eyebrow">The portfolio</p>
      <h1 className="display mt-4 text-6xl md:text-8xl">
        Artwork<span className="text-[#9c8062]">.</span>
      </h1>
      <p className="mt-6 max-w-xl text-sm leading-7 text-[#77736d]">
        A selection of paintings, visual studies and ongoing explorations.
        This archive brings together finished works and ideas in progress.
      </p>
      <ArtworkGallery />
      <p className="mt-12 text-[10px] leading-5 text-[#77736d]">
        This early catalogue uses temporary reference imagery and sample
        catalogue entries. Original artwork photographs and verified details
        will replace these as the archive develops.
      </p>
    </main>
  );
}
