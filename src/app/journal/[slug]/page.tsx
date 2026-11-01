import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function JournalPost({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const supabase=await createClient();
  const {data:post}=await supabase.from("journal_posts").select("*").eq("slug",slug).eq("status","published").maybeSingle();
  if(!post)notFound();
  return <main className="container py-16 md:py-24">
    <Link href="/journal" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">← Back to journal</Link>
    <article className="mx-auto mt-12 max-w-3xl">
      <p className="eyebrow">{post.published_at?new Date(post.published_at).toLocaleDateString("en-UG",{day:"numeric",month:"long",year:"numeric"}):"From the studio"}</p>
      <h1 className="display mt-4 text-5xl leading-[1.08] md:text-7xl">{post.title}</h1>
      {post.excerpt&&<p className="mt-7 text-lg leading-8 text-[#77736d]">{post.excerpt}</p>}
      {post.cover_image&&<div className="relative mt-12 aspect-[16/10] overflow-hidden bg-[#e9e6df]"><img src={post.cover_image} alt={post.title} className="absolute inset-0 h-full w-full object-cover"/></div>}
      <div className="mt-12 space-y-8 text-base leading-8 text-[#45423d]">{(post.content||"").split(/\n\s*\n/).filter(Boolean).map((block:string,index:number)=>{
        const match=block.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
        if(match)return <figure key={index} className="my-10"><img src={match[2]} alt={match[1]||post.title} className="h-auto w-full object-contain"/>{match[1]&&<figcaption className="mt-3 text-xs text-[#89847c]">{match[1]}</figcaption>}</figure>;
        return <p key={index} className="whitespace-pre-wrap">{block}</p>;
      })}</div>
    </article>
  </main>;
}
