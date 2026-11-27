import Link from "next/link";
import Image from "next/image";
import { RemoteImage } from "@/components/remote-image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata, plainText, shareImage } from "@/lib/site";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!project) return {};
  const image = project.cover_image
    ? (project.cover_image.startsWith("http") ? project.cover_image : supabase.storage.from("artwork-images").getPublicUrl(project.cover_image).data.publicUrl)
    : undefined;
  return pageMetadata({
    title: project.title,
    description: plainText(project.summary || project.brief) || "A selected project by Okecha Willy.",
    path: "/projects/" + project.slug,
    image: shareImage(image),
    imageAlt: project.title,
  });
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (!project) notFound();

  const { data: client } = project.client_id
    ? await supabase.from("clients").select("name").eq("id", project.client_id).maybeSingle()
    : { data: null };
  const imageUrl = (path: string) => path.startsWith("http")
    ? path
    : supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
  const gallery = Array.isArray(project.gallery) ? project.gallery as string[] : [];

  return (
    <main className="container pb-24 pt-12 md:pt-16">
      <Link href="/projects" className="text-[10px] uppercase tracking-[.15em] underline underline-offset-4">All projects</Link>
      <header className="mx-auto mt-12 max-w-4xl">
        <p className="eyebrow">{project.project_type}{client?.name ? " · " + client.name : ""}</p>
        <h1 className="display mt-4 text-5xl leading-[1.05] md:text-7xl">{project.title}</h1>
        {project.summary && <p className="mt-7 max-w-2xl text-lg leading-8 text-[#77736d]">{project.summary}</p>}
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-y border-[#dedad2] py-4 text-xs text-[#77736d]">
          {project.location && <span>{project.location}</span>}
          {project.timeframe && <span>{project.timeframe}</span>}
        </div>
      </header>
      {project.cover_image
        ? <div className="relative mt-12 aspect-[16/9] overflow-hidden bg-[#e8e5de]"><Image src={imageUrl(project.cover_image)} alt={project.title} fill priority sizes="100vw" className="object-cover" /></div>
        : <div className="mt-12 flex aspect-[16/9] items-center justify-center bg-[#eeece6] text-[10px] uppercase tracking-[.16em] text-[#89847c]">Project photograph to be added</div>}
      <div className="mx-auto mt-14 grid max-w-4xl gap-x-10 gap-y-4 md:grid-cols-[1fr_2fr]">
        {project.brief && <><h2 className="display text-2xl">The brief</h2><p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.brief}</p></>}
        {project.approach && <><h2 className="display text-2xl">The approach</h2><p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.approach}</p></>}
        {project.outcome && <><h2 className="display text-2xl">The outcome</h2><p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.outcome}</p></>}
      </div>
      {gallery.length > 0 && <section className="mt-16 grid gap-5 sm:grid-cols-2">
        {gallery.map((src, i) => <div key={i} className="relative aspect-[4/3] overflow-hidden bg-[#e8e5de]"><RemoteImage src={imageUrl(src)} alt={project.title + " project photograph " + (i + 1)} className="h-full w-full object-cover" /></div>)}
      </section>}
      <div className="mt-20 border-t border-[#dedad2] pt-8">
        <p className="eyebrow">Have a project in mind?</p>
        <h2 className="display mt-3 text-4xl">Let’s start a conversation.</h2>
        <Link href="/contact" className="mt-6 inline-block border-b border-[#9c8062] pb-2 text-[10px] uppercase tracking-[.15em]">Discuss a commission</Link>
      </div>
    </main>
  );
}
