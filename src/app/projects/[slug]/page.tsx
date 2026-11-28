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
  const clientRelation = (project as unknown as { client?: { name?: string } | { name?: string }[] | null }).client;
  const clientName = Array.isArray(clientRelation) ? clientRelation[0]?.name ?? "" : clientRelation?.name ?? "";
  const projectFacts = [
    clientName ? { label: "Client", value: clientName } : null,
    project.project_type ? { label: "Project type", value: project.project_type } : null,
    project.timeframe ? { label: "Timeframe", value: project.timeframe } : null,
    project.location ? { label: "Location", value: project.location } : null,
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));


  return (
    <main className="pb-24">
      <section className="container pt-8 md:pt-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/projects" className="inline-flex rounded-full border border-[#dedad2] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#625e57] transition-colors hover:border-[#9c8062] hover:text-[#9c8062]">
            Back to selected work
          </Link>
          <p className="eyebrow">{project.project_type || "Selected project"}{clientName ? " · " + clientName : ""}</p>
        </div>
        <div className="grid gap-6 pb-8 pt-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,.48fr)] md:items-end md:pb-10 md:pt-16">
          <h1 className="display max-w-5xl text-5xl leading-[.96] md:text-7xl lg:text-[6.5rem]">{project.title}</h1>
          {project.summary && (
            <p className="max-w-lg pb-1 text-sm leading-8 text-[#77736d] md:justify-self-end md:text-base">{project.summary}</p>
          )}
        </div>
      </section>

      {project.cover_image ? (
        <section className="container">
          <div className="relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:aspect-[2.05/1]">
            <Image
              src={imageUrl(project.cover_image)}
              alt={project.title + " — completed project"}
              fill
              priority
              sizes="(min-width:1280px) 1200px, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      ) : (
        <section className="container">
          <div className="flex aspect-[5/4] items-center justify-center bg-[#e8e5de] md:aspect-[2.05/1]">
            <span className="display text-4xl md:text-6xl">{project.title}</span>
          </div>
        </section>
      )}

      <section className="container border-b border-[#dedad2] py-9 md:py-14">
        <div className="grid gap-9 md:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)_minmax(150px,.65fr)] md:gap-12">
          <div>
            <p className="eyebrow">Selected project</p>
            <h2 className="display mt-3 text-3xl leading-tight md:text-4xl">{clientName || project.project_type || "A commissioned work"}</h2>
          </div>
          <div>
            <p className="eyebrow">About the project</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-[#625e57] md:text-[15px]">
              {project.brief || project.summary || "A selected project by Okecha Willy."}
            </p>
          </div>
          <div>
            <p className="eyebrow">Project details</p>
            <dl className="mt-4 space-y-4">
              {projectFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[9px] font-semibold uppercase tracking-[.15em] text-[#89847c]">{fact.label}</dt>
                  <dd className="mt-1 text-sm leading-6 text-[#625e57]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {project.approach && (
        <section className="container py-14 md:py-20">
          <div className="grid gap-5 md:grid-cols-[minmax(180px,.7fr)_minmax(0,1.3fr)] md:gap-12">
            <p className="eyebrow">The creative approach</p>
            <p className="max-w-4xl whitespace-pre-line text-lg leading-8 text-[#625e57] md:text-2xl md:leading-[1.65]">{project.approach}</p>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="container">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-t border-[#dedad2] pt-7 md:mb-10 md:pt-9">
            <div>
              <p className="eyebrow">The work in detail</p>
              <h2 className="display mt-3 text-3xl md:text-5xl">A closer look.</h2>
            </div>
            <p className="text-[10px] uppercase tracking-[.14em] text-[#89847c]">
              {gallery.length.toString().padStart(2, "0")} {gallery.length === 1 ? "image" : "images"}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            {gallery.map((src, index) => {
              const layout = index === 0
                ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-7"
                : index === 1
                  ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-5 md:mt-24"
                  : index === 2
                    ? "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-5"
                    : "relative aspect-[5/4] overflow-hidden bg-[#e8e5de] md:col-span-7 md:mt-16";
              return (
                <figure key={src + index} className={layout}>
                  <RemoteImage
                    src={imageUrl(src)}
                    alt={project.title + " — project photograph " + (index + 1)}
                    className="h-full w-full object-cover"
                  />
                </figure>
              );
            })}
          </div>
        </section>
      )}

      {project.outcome && (
        <section className="container py-16 md:py-24">
          <div className="mx-auto max-w-4xl border-y border-[#dedad2] py-10 text-center md:py-16">
            <p className="eyebrow">The outcome</p>
            <p className="display mt-5 text-3xl leading-[1.2] md:text-5xl md:leading-[1.2]">{project.outcome}</p>
          </div>
        </section>
      )}

      <section className="container mt-10 md:mt-16">
        <div className="grid gap-6 border-t border-[#dedad2] pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Have a project in mind?</p>
            <h2 className="display mt-4 max-w-3xl text-4xl leading-tight md:text-6xl">Let’s create something meaningful.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#77736d]">
              For commissions, collaborations or a project you would like to bring to life, I would love to hear from you.
            </p>
          </div>
          <Link href="/contact" className="inline-flex w-fit rounded-full bg-[#242320] px-7 py-4 text-[10px] font-semibold uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">
            Start a conversation
          </Link>
        </div>
        {otherProjects?.length ? (
          <div className="mt-16 md:mt-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="eyebrow">Continue exploring</p>
                <h2 className="display mt-3 text-3xl md:text-5xl">More selected work.</h2>
              </div>
              <Link href="/projects" className="text-[10px] font-semibold uppercase tracking-[.14em] underline underline-offset-4">All projects</Link>
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
