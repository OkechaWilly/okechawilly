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
  const { data: project } = await supabase
    .from("projects")
    .select("*, client:clients(name)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!project) return {};
  const image = project.cover_image
    ? project.cover_image.startsWith("http")
      ? project.cover_image
      : supabase.storage.from("artwork-images").getPublicUrl(project.cover_image).data.publicUrl
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
  const [{ data: project }, { data: otherProjects }] = await Promise.all([
    supabase.from("projects").select("*, client:clients(name)").eq("slug", slug).eq("is_published", true).maybeSingle(),
    supabase.from("projects").select("id,title,slug,project_type,cover_image").eq("is_published", true).neq("slug", slug).order("is_featured", { ascending: false }).order("sort_order").limit(2),
  ]);

  if (!project) notFound();

  const imageUrl = (path: string) => path.startsWith("http")
    ? path
    : supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
  const gallery = Array.isArray(project.gallery) ? project.gallery as string[] : [];
  const clientName = project.client?.[0]?.name ?? "";
  const projectFacts = [
    clientName ? { label: "Client", value: clientName } : null,
    project.project_type ? { label: "Project", value: project.project_type } : null,
    project.timeframe ? { label: "Duration", value: project.timeframe } : null,
    project.location ? { label: "Location", value: project.location } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <main className="pb-24">
      <div className="container pt-8 md:pt-12">
        <Link href="/projects" className="inline-flex items-center rounded-full border border-[#dedad2] px-4 py-2.5 text-[10px] uppercase tracking-[.14em] text-[#625e57] transition-colors hover:border-[#9c8062] hover:text-[#9c8062]">
          Back to projects
        </Link>
        <header className="mx-auto max-w-5xl pb-10 pt-12 md:pb-14 md:pt-16">
          <p className="eyebrow">{project.project_type || "Selected project"}</p>
          <h1 className="display mt-4 max-w-5xl text-5xl leading-[1.02] md:text-7xl lg:text-8xl">{project.title}</h1>
          {project.summary && <p className="mt-7 max-w-3xl text-base leading-8 text-[#77736d] md:text-lg">{project.summary}</p>}
        </header>
      </div>

      {project.cover_image && (
        <div className="container">
          <div className="relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:aspect-[2/1]">
            <Image src={imageUrl(project.cover_image)} alt={project.title} fill priority sizes="100vw" className="object-cover" />
          </div>
        </div>
      )}

      {projectFacts.length > 0 && (
        <section className="container border-b border-[#dedad2] py-6 md:py-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
            {projectFacts.map((fact) => (
              <div key={fact.label}>
                <dt className="eyebrow">{fact.label}</dt>
                <dd className="mt-2 text-sm leading-6 text-[#625e57]">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(project.brief || project.approach || project.outcome) && (
        <section className="container py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-[minmax(190px,.8fr)_minmax(0,2fr)] md:gap-20">
            <div>
              <p className="eyebrow">Inside the project</p>
              <h2 className="display mt-3 text-3xl leading-tight md:text-4xl">From the first idea to the finished space.</h2>
            </div>
            <div className="space-y-10 md:space-y-12">
              {project.brief && (
                <article className="grid gap-3 border-b border-[#e8e5de] pb-8 md:grid-cols-[150px_1fr] md:gap-8">
                  <h3 className="text-xs font-semibold uppercase tracking-[.13em]">The brief</h3>
                  <p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.brief}</p>
                </article>
              )}
              {project.approach && (
                <article className="grid gap-3 border-b border-[#e8e5de] pb-8 md:grid-cols-[150px_1fr] md:gap-8">
                  <h3 className="text-xs font-semibold uppercase tracking-[.13em]">The approach</h3>
                  <p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.approach}</p>
                </article>
              )}
              {project.outcome && (
                <article className="grid gap-3 md:grid-cols-[150px_1fr] md:gap-8">
                  <h3 className="text-xs font-semibold uppercase tracking-[.13em]">The outcome</h3>
                  <p className="whitespace-pre-line text-sm leading-8 text-[#625e57]">{project.outcome}</p>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="container">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-t border-[#dedad2] pt-8">
            <div>
              <p className="eyebrow">A closer look</p>
              <h2 className="display mt-2 text-3xl md:text-4xl">The work in detail.</h2>
            </div>
            <p className="max-w-xs text-xs leading-6 text-[#77736d]">Selected views from the completed project.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-12">
            {gallery.map((src, index) => (
              <div key={src + index} className={index === 0 ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-7 md:aspect-[5/4]" : "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-5 md:aspect-[5/4]"}>
                <RemoteImage src={imageUrl(src)} alt={project.title + " project photograph " + (index + 1)} className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.015]" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container mt-20 md:mt-28">
        <div className="bg-[#242320] px-7 py-12 text-[#f7f6f2] md:px-14 md:py-16">
          <p className="eyebrow !text-[#c6b49e]">Have a project in mind?</p>
          <div className="mt-4 grid gap-7 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <h2 className="display max-w-3xl text-4xl leading-tight md:text-6xl">Let’s create something with meaning.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/70">For commissions, collaborations or a project you would like to bring to life, I would love to hear from you.</p>
            </div>
            <Link href="/contact" className="inline-flex w-fit rounded-full bg-[#f7f6f2] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-[#242320] transition-colors hover:bg-[#d0aa83]">Start a conversation</Link>
          </div>
        </div>
        {otherProjects?.length ? (
          <div className="mt-16">
            <div className="mb-7 flex items-end justify-between gap-5">
              <div><p className="eyebrow">Continue exploring</p><h2 className="display mt-2 text-3xl md:text-4xl">More selected projects.</h2></div>
              <Link href="/projects" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">All projects</Link>
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              {otherProjects.map((item) => {
                const image = item.cover_image ? imageUrl(item.cover_image) : "";
                return (
                  <Link key={item.id} href={"/projects/" + item.slug} className="group">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#e8e5de]">
                      {image && <Image src={image} alt={item.title} fill sizes="(min-width:640px) 50vw,100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" />}
                    </div>
                    <p className="eyebrow mt-4">{item.project_type || "Selected project"}</p>
                    <h3 className="display mt-2 text-2xl md:text-3xl">{item.title}</h3>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
