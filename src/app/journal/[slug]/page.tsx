import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RemoteImage } from "@/components/remote-image";

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("journal_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!post) notFound();

  const lines = (post.content || "").split("\n");
  const blocks: { type: "text" | "image"; value: string; alt?: string }[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    const value = paragraph.join("\n").trim();
    if (value) blocks.push({ type: "text", value });
    paragraph = [];
  };

  for (const line of lines) {
    const match = line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    if (match) {
      flush();
      blocks.push({ type: "image", value: match[2], alt: match[1] });
    } else if (!line.trim()) {
      flush();
    } else {
      paragraph.push(line);
    }
  }
  flush();

  return <main className="container py-16 md:py-24">
    <Link href="/journal" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">← Back to journal</Link>
    <article className="mx-auto mt-12 max-w-3xl">
      <p className="eyebrow">{post.published_at ? new Date(post.published_at).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" }) : "From the studio"}</p>
      <h1 className="display mt-4 text-5xl leading-[1.08] md:text-7xl">{post.title}</h1>
      {post.excerpt && <p className="mt-7 text-lg leading-8 text-[#77736d]">{post.excerpt}</p>}
      {post.cover_image && <div className="relative mt-12 aspect-[16/10] overflow-hidden bg-[#e9e6df]"><RemoteImage src={post.cover_image} alt={post.title} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover"/></div>}
      <div className="mt-12 space-y-8 text-base leading-8 text-[#45423d]">
        {blocks.map((block, index) => block.type === "image"
          ? <figure key={index} className="my-10"><RemoteImage src={block.value} alt={block.alt || post.title} sizes="(min-width: 768px) 768px, 100vw" className="h-auto w-full object-contain"/>{block.alt && <figcaption className="mt-3 text-xs text-[#89847c]">{block.alt}</figcaption>}</figure>
          : <p key={index} className="whitespace-pre-wrap">{block.value}</p>)}
      </div>
    </article>
  </main>;
}
