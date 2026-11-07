import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RemoteImage } from "@/components/remote-image";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Journal",
  description: "Notes on art, process, materials, research and ideas from the studio of Okecha Willy.",
  path: "/journal",
});

export default async function Journal() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from("journal_posts").select("id,title,slug,excerpt,cover_image,published_at").eq("status","published").order("published_at",{ascending:false});
  return <main className="container py-20">
    <p className="eyebrow">Notes from the practice</p>
    <h1 className="display mt-4 text-6xl md:text-8xl">Journal<span className="text-[#9c8062]">.</span></h1>
    <p className="mt-5 max-w-2xl text-sm leading-7 text-[#77736d]">Ideas, processes, materials and stories behind the work.</p>
    {posts?.length ? <div className="mt-16 grid gap-x-8 gap-y-14 md:grid-cols-2">
      {posts.map(post=><article key={post.id}>
        <Link href={`/journal/${post.slug}`} className="group block">
          {post.cover_image ? <div className="relative mb-5 aspect-[4/3] overflow-hidden bg-[#e9e6df]"><RemoteImage src={post.cover_image} alt={post.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"/></div> : <div className="mb-5 aspect-[4/3] bg-[#e9e6df]"/>}
          <p className="eyebrow">{post.published_at ? new Date(post.published_at).toLocaleDateString("en-UG",{day:"numeric",month:"long",year:"numeric"}) : "From the studio"}</p>
          <h2 className="display mt-3 text-3xl">{post.title}</h2>
          {post.excerpt&&<p className="mt-3 text-sm leading-7 text-[#77736d]">{post.excerpt}</p>}
          <span className="mt-5 inline-block text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Read journal entry ↗</span>
        </Link>
      </article>)}
    </div> : <div className="mt-14 max-w-2xl border-y border-[#e8e5de] py-8"><p className="eyebrow">The studio notebook</p><h2 className="serif mt-3 text-3xl">Ideas, processes and things worth looking at.</h2><p className="mt-4 text-sm leading-7 text-[#77736d]">New notes from the studio will appear here. In the meantime, explore the artwork archive.</p><Link href="/artwork" className="mt-6 inline-block text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Explore artwork ↗</Link></div>}
  </main>;
}
