import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArtworkCard } from "@/components/artwork-card";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: featuredData }, { data: collectionData }] = await Promise.all([
    supabase.from("artworks").select("*, artwork_images(*)").eq("is_published", true).order("is_featured", { ascending: false }).order("sort_order", { ascending: true }).order("created_at", { ascending: false }).limit(4),
    supabase.from("collections").select("*").eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }).limit(3),
  ]);

  const featured = (featuredData ?? []).map((artwork) => {
    const images = [...(artwork.artwork_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const image = images[0]?.storage_path ? supabase.storage.from("artwork-images").getPublicUrl(images[0].storage_path).data.publicUrl : "";
    return { slug: artwork.slug, title: artwork.title, year: artwork.year?.toString() ?? "Undated", medium: artwork.medium ?? "Medium not specified", image, status: artwork.status.replaceAll("_", " ") };
  });

  const collections = (collectionData ?? []).map((collection) => ({
    ...collection,
    image: collection.cover_image
      ? (collection.cover_image.startsWith("http") ? collection.cover_image : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl)
      : "",
  }));

  return <main>
    <section className="container grid min-h-[690px] items-center gap-12 py-16 md:grid-cols-[.88fr_1.12fr] md:py-20">
      <div className="order-2 md:order-1">
        <p className="eyebrow mb-7">Independent artist · Uganda</p>
        <h1 className="display max-w-[620px] text-[clamp(58px,7vw,100px)]">Art that<br/><em className="text-[#9c8062]">holds</em> a story.</h1>
        <p className="mt-8 max-w-md text-[15px] leading-7 text-[#77736d]">Exploring identity, spirituality, culture and the human experience through visual art. A growing collection of paintings, ideas and visual studies.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/artwork" className="bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white transition hover:bg-[#9c8062]">Explore artwork ↗</Link><Link href="/about" className="border border-[#c9c5bc] px-7 py-4 text-[10px] uppercase tracking-[.15em] transition hover:border-[#242320]">Meet the artist</Link></div>
        <p className="mt-16 text-[10px] uppercase tracking-[.16em] text-[#aaa49a]">01 — A practice in progress</p>
      </div>
      <div className="order-1 relative md:order-2"><div className="aspect-[4/4.6] overflow-hidden bg-[#e7e2d9]"><img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1600&q=90" alt="Temporary gallery reference photograph" className="h-full w-full object-cover"/></div><div className="absolute -bottom-5 -left-5 bg-[#f7f6f2] px-5 py-4"><p className="eyebrow">Selected visual study</p><p className="serif mt-1 text-xl">The language of colour</p></div></div>
    </section>
    <section className="border-y border-[#e8e5de] py-6"><div className="container flex flex-wrap items-center justify-between gap-4"><p className="eyebrow">A visual practice rooted in curiosity</p><p className="serif text-lg italic text-[#77736d]">Kampala · Uganda · Everywhere</p></div></section>
    <section className="container py-24">
      <div className="mb-10 flex items-end justify-between"><div><p className="eyebrow mb-3">Browse the practice</p><h2 className="display text-5xl md:text-6xl">Explore collections</h2></div><Link href="/collections" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">All collections ↗</Link></div>
      {collections.length ? <div className="grid gap-5 md:grid-cols-3">{collections.map((collection) => <Link href={"/collections/" + collection.slug} key={collection.id} className="group"><div className="image-hover aspect-[4/5] overflow-hidden bg-[#e7e2d9]">{collection.image ? <img src={collection.image} alt={collection.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-8 text-center"><span className="serif text-3xl">{collection.title}</span></div>}</div><p className="eyebrow mt-4">Collection</p><div className="mt-1 flex justify-between"><h3 className="serif text-2xl">{collection.title}</h3><span>↗</span></div></Link>)}</div> : <p className="text-sm text-[#77736d]">New collections will appear here as they are published.</p>}
    </section>
    <section className="bg-[#eeece6] py-24"><div className="container"><div className="mb-10 flex items-end justify-between"><div><p className="eyebrow mb-3">From the portfolio</p><h2 className="display text-5xl md:text-6xl">Selected works</h2></div><Link href="/artwork" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">View all works ↗</Link></div>
      {featured.length ? <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">{featured.map((artwork) => <ArtworkCard key={artwork.slug} item={artwork}/>)}</div> : <p className="text-sm text-[#77736d]">Published artworks will appear here once they are added to the portfolio.</p>}
    </div></section>
    <section className="container grid gap-12 py-24 md:grid-cols-2 md:items-center"><div className="aspect-[4/4.2] overflow-hidden bg-[#e7e2d9]"><img src="https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=1200&q=85" alt="Temporary studio and art reference" className="h-full w-full object-cover"/></div><div className="max-w-lg"><p className="eyebrow mb-4">A little about the artist</p><h2 className="display text-5xl md:text-6xl">Making sense<br/>of the world.</h2><p className="mt-7 text-sm leading-7 text-[#77736d]">My practice moves between observation, storytelling and experimentation. I am interested in the ways art can hold memory, question belief and open up new ways of seeing the world around us.</p><Link href="/about" className="mt-8 inline-block border-b border-[#242320] pb-2 text-[10px] uppercase tracking-[.15em]">Read my story ↗</Link></div></section>
    <section className="container pb-24"><div className="bg-[#242320] px-8 py-16 text-center text-[#f7f6f2] md:px-20"><p className="eyebrow !text-[#c6b49e]">Have something in mind?</p><h2 className="display mx-auto mt-5 max-w-2xl text-5xl md:text-6xl">Let’s make room for a conversation.</h2><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#c5c1b9]">For original artwork, commissions, collaborations and enquiries.</p><Link href="/contact" className="mt-8 inline-block bg-[#f7f6f2] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-[#242320]">Get in touch ↗</Link></div></section>
  </main>;
}
