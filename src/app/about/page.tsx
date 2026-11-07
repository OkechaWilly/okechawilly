import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { storageUrl } from "@/lib/images";
import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata, plainText, shareImage } from "@/lib/site";

type Theme = { title: string; description: string };
type GalleryItem = { path: string; alt?: string; caption?: string };
const fallbackThemes: Theme[] = [
  { title: "Memory & identity", description: "I am interested in the ways personal and collective histories shape how we understand ourselves and the places we belong to." },
  { title: "Faith & the everyday", description: "I explore the presence of belief in ordinary life — through places of worship, people, symbols, rituals and the questions they leave behind." },
  { title: "Nature & our environment", description: "The natural world is both subject and context: a source of form, material, reflection and questions about our relationship with the earth." },
];
const fallbackIntro = "I am a Ugandan visual artist working across painting, drawing and visual storytelling. My practice explores identity, spirituality, culture, nature and the many ways we experience being human.";
const fallbackStatement = "I make work to look more closely at the things that shape our lives: the stories we inherit, the beliefs we carry, the environments we inhabit and the relationships we form with one another. I am drawn to subjects that hold more than one meaning, where the visible world can open a path toward memory, feeling or reflection.\n\nI approach painting and image-making as forms of inquiry. A church, a portrait, a landscape or an everyday object can become a starting point for thinking about belonging, power, faith, change and the passage of time. I want the work to remain open enough for viewers to bring their own experiences to it.\n\nWorking from Uganda, I draw from the textures and complexities of the world around me while remaining curious about the connections between local stories and wider human experience.";
const fallbackBio = "My relationship with art began in childhood, making and experimenting alongside my four brothers. I returned to a more deliberate visual-art practice in 2019, while completing a Computer Science degree at Ndejje University.\n\nThat meeting of creative practice and technology continues to inform how I think about images, process and communication. It has also kept me curious about the possibilities of different materials and ways of telling stories.\n\nMy current painting direction includes an ongoing exploration of religion and its place in society, with particular attention to churches, church leaders and portraiture.";
const imageUrl = (path: string) => storageUrl("artwork-images", path);

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_profile").select("*").eq("id", 1).maybeSingle();
  const p = data?.is_published ? data : null;
  const portrait = p?.portrait_path || "3732b0e8-e117-46b0-86ae-7158784b9d09/ff7cffa7-c05a-42cd-ade6-1402b1260a09.png";
  const name = p?.display_name || "Okecha Willy";
  return pageMetadata({
    title: "About the artist",
    description: plainText(p?.introduction || fallbackIntro),
    path: "/about",
    image: shareImage(imageUrl(portrait)),
    imageAlt: `Portrait of ${name}`,
  });
}

export default async function About() {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_profile").select("*").eq("id", 1).maybeSingle();
  const p = data?.is_published ? data : null;
  const name = p?.display_name || "Okecha Willy";
  const themes: Theme[] = p?.themes?.length ? p.themes : fallbackThemes;
  const paragraphs = (p?.artist_statement || fallbackStatement).split(/\n\s*\n/);
  const bio = (p?.biography || fallbackBio).split(/\n\s*\n/);
  const portrait = p?.portrait_path || "3732b0e8-e117-46b0-86ae-7158784b9d09/ff7cffa7-c05a-42cd-ade6-1402b1260a09.png";
  const gallery: GalleryItem[] = p?.gallery || [];
  return <main>
    <section className="container py-16 md:py-24"><p className="eyebrow">The artist</p><div className="mt-6 grid gap-10 md:grid-cols-[1.1fr_.8fr] md:items-end">
      <div><h1 className="display text-6xl leading-[.98] md:text-8xl">{name.split(" ")[0]}<br/><em className="text-[#9c8062]">{name.split(" ").slice(1).join(" ") || "Artist"}.</em></h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#77736d]">{p?.introduction || fallbackIntro}</p><p className="mt-5 text-[10px] uppercase tracking-[.16em] text-[#9c8062]">Based in {p?.location || "Uganda"} · Working everywhere</p></div>
      <figure className="relative min-h-[440px] overflow-hidden bg-[#e9e5dc] md:min-h-[570px]"><Image src={imageUrl(portrait)} alt={`Portrait of ${name}`} fill priority sizes="(min-width: 768px) 38vw, 100vw" className="object-cover object-center"/><figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-6 pb-6 pt-16 text-[10px] uppercase tracking-[.16em] text-white">{name} — Artist</figcaption></figure>
    </div></section>
    <section className="border-y border-[#e7e3dc] bg-[#f1efe9]"><div className="container grid gap-10 py-16 md:grid-cols-[.7fr_1.3fr] md:py-24"><div><p className="eyebrow">Artist statement</p><h2 className="display mt-4 max-w-sm text-4xl leading-tight md:text-5xl">Images as a way of asking questions.</h2></div><div className="max-w-2xl space-y-5 text-sm leading-8 text-[#6f6b64] md:text-base">{paragraphs.map((v:string,i:number)=><p key={i}>{v}</p>)}</div></div></section>
    <section className="container py-16 md:py-24"><div className="grid gap-12 md:grid-cols-[.7fr_1.3fr]"><div><p className="eyebrow">Areas of inquiry</p><h2 className="display mt-4 text-4xl md:text-5xl">What I return to.</h2></div><div className="divide-y divide-[#e7e3dc]">{themes.map((t:Theme,i:number)=><article key={i} className="grid gap-3 py-7 first:pt-0 md:grid-cols-[60px_1fr]"><span className="pt-1 text-xs tracking-[.16em] text-[#9c8062]">0{i+1}</span><div><h3 className="display text-2xl">{t.title}</h3><p className="mt-3 max-w-xl text-sm leading-7 text-[#77736d]">{t.description}</p></div></article>)}</div></div></section>
    {gallery.length>0 && <section className="border-y border-[#e7e3dc] bg-[#f1efe9] py-14 md:py-20"><div className="container"><p className="eyebrow">In the studio</p><h2 className="display mt-3 text-4xl md:text-5xl">Practice & process.</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((item:GalleryItem,i:number)=><figure key={item.path}><div className="relative aspect-[4/5] overflow-hidden bg-[#e9e5dc]"><Image src={imageUrl(item.path)} alt={item.alt || `Studio photograph ${i+1}`} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover"/></div>{item.caption && <figcaption className="mt-2 text-xs text-[#77736d]">{item.caption}</figcaption>}</figure>)}</div></div></section>}
    <section className="border-t border-[#e7e3dc]"><div className="container grid gap-8 py-16 md:grid-cols-[.7fr_1.3fr] md:py-20"><div><p className="eyebrow">Background</p><h2 className="display mt-4 text-4xl md:text-5xl">A path between art and technology.</h2></div><div className="max-w-2xl space-y-5 text-sm leading-8 text-[#77736d] md:text-base">{bio.map((v:string,i:number)=><p key={i}>{v}</p>)}</div></div></section>
    <section className="container pb-20 md:pb-28"><div className="flex flex-col gap-6 border-t border-[#e7e3dc] pt-8 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Explore the work</p><h2 className="display mt-3 text-4xl md:text-5xl">Ideas become images.</h2></div><Link href="/artwork" className="inline-flex w-fit border-b border-[#9c8062] pb-2 text-xs uppercase tracking-[.16em] text-[#4d4943] transition-colors hover:text-[#9c8062]">View selected artwork <span className="ml-4">↗</span></Link></div></section>
  </main>;
}
