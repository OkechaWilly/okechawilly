import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Collections() {
  const supabase = await createClient();
  const { data } = await supabase.from("collections").select("*").eq("is_published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  const collections = (data ?? []).map((collection) => ({
    ...collection,
    image: collection.cover_image ? (collection.cover_image.startsWith("http") ? collection.cover_image : supabase.storage.from("artwork-images").getPublicUrl(collection.cover_image).data.publicUrl) : "",
  }));

  return <main className="container py-20">
    <p className="eyebrow">Browse by theme</p><h1 className="display mt-4 text-6xl md:text-8xl">Collections<span className="text-[#9c8062]">.</span></h1>
    {collections.length ? <div className="mt-14 grid gap-7 md:grid-cols-3">{collections.map((collection) => <Link key={collection.id} href={"/collections/" + collection.slug} className="group"><div className="image-hover aspect-[4/5] overflow-hidden bg-[#e7e2d9]">{collection.image ? <img src={collection.image} alt={collection.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center p-8 text-center"><span className="serif text-3xl">{collection.title}</span></div>}</div><p className="eyebrow mt-4">Collection</p><h2 className="serif mt-1 text-3xl">{collection.title}</h2>{collection.description && <p className="mt-3 text-sm leading-6 text-[#77736d]">{collection.description}</p>}</Link>)}</div> : <p className="mt-12 text-sm text-[#77736d]">Collections will appear here once they have been created and published in the studio.</p>}
  </main>;
}
