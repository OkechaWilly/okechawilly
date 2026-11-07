import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RemoteImage } from "@/components/remote-image";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, absoluteUrl, pageMetadata, plainText, shareImage } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("journal_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: plainText(post.excerpt || post.content) || `A journal entry from the studio of ${SITE_NAME}.`,
    path: `/journal/${post.slug}`,
    image: shareImage(post.cover_image),
    imageAlt: post.title,
    type: "article",
    publishedTime: post.published_at ?? undefined,
  });
}

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

  const postSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    url: absoluteUrl(`/journal/${post.slug}`),
    mainEntityOfPage: absoluteUrl(`/journal/${post.slug}`),
    author: { "@type": "Person", name: SITE_NAME, url: SITE_URL },
    ...(post.excerpt ? { description: plainText(post.excerpt, 300) } : {}),
    ...(post.cover_image ? { image: shareImage(post.cover_image) } : {}),
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
  };

  return <main className="container py-16 md:py-24">
    <JsonLd data={postSchema} />
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
