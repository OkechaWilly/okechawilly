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

type JournalBlock =
  | { type: "paragraph"; value: string }
  | { type: "heading"; value: string; level: 2 | 3 }
  | { type: "image"; value: string; alt?: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; value: string };

function parseJournalContent(content: string, title: string): JournalBlock[] {
  const lines = content.replace(/^\uFEFF/, "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();

  // Older entries repeat their title at the start of the body. Keep the page
  // title as the single title and remove only that duplicated opening line.
  if (lines[0]?.trim().startsWith(title)) lines.shift();

  const blocks: JournalBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join("\n").trim();
    if (value) {
      const singleLine = value.replace(/\s+/g, " ").trim();
      const isLegacyHeading =
        !value.includes("\n") &&
        singleLine.length <= 88 &&
        singleLine.split(/\s+/).length <= 10 &&
        !/[.!?;:]$/.test(singleLine);
      blocks.push(isLegacyHeading
        ? { type: "heading", value: singleLine, level: 2 }
        : { type: "paragraph", value });
    }
    paragraph = [];
  };
  const flushList = () => {
    if (listItems.length) blocks.push({ type: "list", items: [...listItems] });
    listItems = [];
  };
  const flushQuote = () => {
    if (quoteLines.length) blocks.push({ type: "quote", value: quoteLines.join("\n").trim() });
    quoteLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const imageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    const isListItem = /^(?:[•*-])\s+/.test(line);
    const isQuote = /^>\s?/.test(line);

    if (!line) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }
    if (imageMatch) {
      flushParagraph(); flushList(); flushQuote();
      blocks.push({ type: "image", value: imageMatch[2], alt: imageMatch[1] });
      continue;
    }
    if (headingMatch) {
      flushParagraph(); flushList(); flushQuote();
      blocks.push({ type: "heading", value: headingMatch[1].trim(), level: 2 });
      continue;
    }
    if (isListItem) {
      flushParagraph(); flushQuote();
      listItems.push(line.replace(/^(?:[•*-])\s+/, ""));
      continue;
    }
    if (isQuote) {
      flushParagraph(); flushList();
      quoteLines.push(line.replace(/^>\s?/, ""));
      continue;
    }
    flushList();
    flushQuote();
    paragraph.push(rawLine);
  }

  flushParagraph();
  flushList();
  flushQuote();
  return blocks;
}

export default async function JournalPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("journal_posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!post) notFound();

  const blocks = parseJournalContent(post.content || "", post.title);
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
    <Link href="/journal" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">Back to journal</Link>
    <article className="mx-auto mt-12 max-w-3xl">
      <p className="eyebrow">{post.published_at ? new Date(post.published_at).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" }) : "From the studio"}</p>
      <h1 className="display mt-4 text-5xl leading-[1.08] md:text-7xl">{post.title}</h1>
      {post.excerpt && <p className="mt-7 text-lg leading-8 text-[#77736d]">{post.excerpt}</p>}
      {post.cover_image && <div className="relative mt-12 aspect-[16/10] overflow-hidden bg-[#e9e6df]"><RemoteImage src={post.cover_image} alt={post.title} fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover"/></div>}
      <div className="mt-12 space-y-8 text-base leading-8 text-[#45423d]">
        {blocks.map((block, index) => {
          if (block.type === "image") {
            return <figure key={index} className="my-10">
              <RemoteImage src={block.value} alt={block.alt || post.title} sizes="(min-width: 768px) 768px, 100vw" className="h-auto w-full object-contain"/>
              {block.alt && <figcaption className="mt-3 text-xs text-[#89847c]">{block.alt}</figcaption>}
            </figure>;
          }
          if (block.type === "heading") return <h2 key={index} className="display pt-4 text-2xl leading-tight md:text-3xl">{block.value}</h2>;
          if (block.type === "list") return <ul key={index} className="my-2 list-disc space-y-3 pl-6 marker:text-[#9c8062]">{block.items.map((item, itemIndex) => <li key={itemIndex} className="pl-2">{item}</li>)}</ul>;
          if (block.type === "quote") return <blockquote key={index} className="border-l-2 border-[#b49a7c] py-1 pl-6 font-serif text-xl leading-8 text-[#6e6255]">{block.value}</blockquote>;
          return <p key={index} className="whitespace-pre-wrap">{block.value}</p>;
        })}
      </div>
    </article>
  </main>;
}
