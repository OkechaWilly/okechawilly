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
  const [{ data: project, error: projectError }, { data: otherProjects }] = await Promise.all([
    supabase.from("projects").select("*, client:clients(name)").eq("slug", slug).eq("is_published", true).maybeSingle(),
    supabase.from("projects").select("id,title,slug,project_type,cover_image").eq("is_published", true).neq("slug", slug).order("is_featured", { ascending: false }).order("sort_order").limit(2),
  ]);
  if (projectError) console.error("[project-detail] Supabase query failed:", projectError);
  if (!project) notFound();

  const imageUrl = (path: string) => path.startsWith("http")
    ? path
    : supabase.storage.from("artwork-images").getPublicUrl(path).data.publicUrl;
  const gallery = Array.isArray(project.gallery) ? project.gallery as string[] : [];
  const clientName = project.client?.[0]?.name ?? "";
  const projectFacts = [
    clientName ? { label: "Client", value: clientName } : null,
    project.project_type ? { label: "Project type", value: project.project_type } : null,
    project.timeframe ? { label: "Timeframe", value: project.timeframe } : null,
    project.location ? { label: "Location", value: project.location } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  const storySections = [
    project.brief ? { label: "The brief", body: project.brief } : null,
    project.approach ? { label: "The approach", body: project.approach } : null,
    project.outcome ? { label: "The outcome", body: project.outcome } : null,
  ].filter((section): section is { label: string; body: string } => Boolean(section));

  return (
    <main className="pb-24">
      <div className="container pt-8 md:pt-12">
        <Link href="/projects" className="inline-flex rounded-full border border-[#dedad2] px-4 py-2.5 text-[10px] uppercase tracking-[.14em] text-[#625e57] transition-colors hover:border-[#9c8062] hover:text-[#9c8062]">
          Back to selected work
        </Link>
        <header className="grid gap-7 pb-10 pt-12 md:grid-cols-[minmax(0,1.35fr)_minmax(250px,.65fr)] md:items-end md:pb-14 md:pt-20">
          <div>
            <p className="eyebrow">{project.project_type || "Selected project"}{clientName ? " · " + clientName : ""}</p>
            <h1 className="display mt-5 max-w-5xl text-5xl leading-[.98] md:text-7xl lg:text-8xl">{project.title}</h1>
          </div>
          {project.summary && <p className="max-w-xl pb-1 text-sm leading-8 text-[#77736d] md:justify-self-end md:text-base">{project.summary}</p>}
        </header>
      </div>

      {project.cover_image && (
        <div className="container">
          <div className="relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:aspect-[2.1/1]">
            <Image src={imageUrl(project.cover_image)} alt={project.title + " — completed project"} fill priority sizes="100vw" className="object-cover" />
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

      {storySections.length > 0 && (
        <section className="container py-16 md:py-24">
          <div className="grid gap-10 md:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)] md:gap-20">
            <div className="md:sticky md:top-24 md:self-start">
              <p className="eyebrow">The story behind the work</p>
              <h2 className="display mt-4 max-w-sm text-3xl leading-[1.08] md:text-4xl">A considered response to a unique brief.</h2>
            </div>
            <div className="divide-y divide-[#e8e5de]">
              {storySections.map((section) => (
                <article key={section.label} className="grid gap-3 py-7 first:pt-0 last:pb-0 md:grid-cols-[125px_minmax(0,1fr)] md:gap-8">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#242320]">{section.label}</h3>
                  <p className="whitespace-pre-line text-sm leading-8 text-[#625e57] md:text-[15px]">{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-[#dedad2] pt-8 md:mb-10">
            <div>
              <p className="eyebrow">Selected details</p>
              <h2 className="display mt-3 text-3xl md:text-5xl">A closer look at the work.</h2>
            </div>
            <p className="max-w-xs text-xs leading-6 text-[#77736d]">Photographs from the completed project.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
            {gallery.map((src, index) => {
              const layout = index === 0
                ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-7 md:aspect-[5/4]"
                : index === 1
                  ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-5 md:mt-20 md:aspect-[4/5]"
                  : index === 2
                    ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-5 md:aspect-[4/5]"
                    : "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-7 md:aspect-[5/4]";
              return (
                <figure key={src + index} className={layout}>
                  <RemoteImage src={imageUrl(src)} alt={project.title + " — project photograph " + (index + 1)} className="h-full w-full object-cover" />
                </figure>
              );
            })}
          </div>
        </section>
      )}

      <section className="container mt-20 md:mt-28">
        <div className="grid gap-6 border-t border-[#dedad2] pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Have a project in mind?</p>
            <h2 className="display mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">Let’s create something meaningful.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#77736d]">For commissions, collaborations or a project you would like to bring to life, I would love to hear from you.</p>
          </div>
          <Link href="/contact" className="inline-flex w-fit rounded-full bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">Start a conversation</Link>
        </div>
        {otherProjects?.length ? (
          <div className="mt-16 md:mt-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
              <div><p className="eyebrow">Continue exploring</p><h2 className="display mt-3 text-3xl md:text-5xl">More selected work.</h2></div>
              <Link href="/projects" className="text-[10px] uppercase tracking-[.14em] underline underline-offset-4">All projects</Link>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              {otherProjects.map((item) => {
                const image = item.cover_image ? imageUrl(item.cover_image) : "";
                return (
                  <Link key={item.id} href={"/projects/" + item.slug} className="group block">
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
