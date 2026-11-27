import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Selected Projects",
  description: "Commissioned work, creative collaborations and selected projects by Okecha Willy.",
  path: "/projects",
});

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,title,slug,summary,project_type,location,cover_image,is_featured,client:clients(name)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) console.error("[projects-archive] Supabase query failed:", error);

  const projects = (data ?? []).map((project) => ({
    ...project,
    image: project.cover_image
      ? project.cover_image.startsWith("http")
        ? project.cover_image
        : supabase.storage.from("artwork-images").getPublicUrl(project.cover_image).data.publicUrl
      : "",
    clientName: project.client?.[0]?.name ?? "",
  }));
  const featured = projects.find((project) => project.is_featured) ?? projects[0];
  const remaining = projects.filter((project) => project.id !== featured?.id);

  return (
    <main className="pb-24">
      <section className="container pb-12 pt-16 md:pb-16 md:pt-24">
        <p className="eyebrow">Commissions · Collaborations · Selected work</p>
        <div className="mt-5 grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(230px,390px)] md:items-end">
          <h1 className="display max-w-4xl text-5xl leading-[1.02] md:text-7xl lg:text-8xl">
            Work made<br className="hidden md:block" /> with purpose.
          </h1>
          <p className="max-w-md pb-1 text-sm leading-7 text-[#77736d] md:justify-self-end">
            A selection of commissions and creative collaborations, shaped around a brief, a place and the people behind it.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-[#dedad2] py-4 text-[10px] uppercase tracking-[.15em] text-[#77736d]">
          <span>{projects.length.toString().padStart(2, "0")} selected {projects.length === 1 ? "project" : "projects"}</span>
          <span>Uganda and beyond</span>
          <Link href="/contact" className="text-[#242320] underline underline-offset-4 transition-colors hover:text-[#9c8062]">Enquire about a project</Link>
        </div>
      </section>

      {featured ? (
        <section className="container">
          <Link href={"/projects/" + featured.slug} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden bg-[#e8e5de] md:aspect-[2.05/1]">
              {featured.image ? (
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full items-center justify-center"><span className="display text-3xl">{featured.title}</span></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#171614]/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-5 p-6 text-white md:p-10">
                <div>
                  <p className="eyebrow !text-white/75">Featured project {featured.project_type ? "· " + featured.project_type : ""}</p>
                  <h2 className="display mt-3 max-w-3xl text-3xl leading-tight md:text-5xl">{featured.title}</h2>
                  {featured.clientName && <p className="mt-3 text-xs text-white/80">{featured.clientName}</p>}
                </div>
                <span className="border border-white/70 px-5 py-3 text-[10px] uppercase tracking-[.15em] transition-colors group-hover:bg-white group-hover:text-[#242320]">Explore project</span>
              </div>
            </div>
          </Link>
          {featured.summary && <p className="mt-5 max-w-2xl text-sm leading-7 text-[#77736d]">{featured.summary}</p>}
        </section>
      ) : (
        <section className="container">
          <div className="border-y border-[#dedad2] py-14 md:py-20">
            <p className="eyebrow">The portfolio is taking shape</p>
            <h2 className="display mt-4 max-w-2xl text-4xl md:text-6xl">Good work begins with a good conversation.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#77736d]">Selected commissions and collaborations will appear here as each project is prepared for the portfolio.</p>
            <Link href="/contact" className="mt-7 inline-flex rounded-full bg-[#242320] px-6 py-3.5 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">Start a conversation</Link>
          </div>
        </section>
      )}

      {remaining.length > 0 && (
        <section className="container mt-20 md:mt-28">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow">More from the portfolio</p>
              <h2 className="display mt-3 text-4xl md:text-5xl">Other projects.</h2>
            </div>
            <p className="max-w-xs text-xs leading-6 text-[#77736d]">A closer look at selected commissions, collaborations and creative work.</p>
          </div>
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
            {remaining.map((project, index) => (
              <Link key={project.id} href={"/projects/" + project.slug} className="group block">
                <div className="relative aspect-[16/11] overflow-hidden bg-[#e8e5de]">
                  {project.image && <Image src={project.image} alt={project.title} fill sizes="(min-width:768px) 50vw,100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.025]" />}
                </div>
                <div className="mt-5 flex items-start justify-between gap-5">
                  <div>
                    <p className="eyebrow">{project.project_type || "Selected project"}{project.clientName ? " · " + project.clientName : ""}</p>
                    <h3 className="display mt-2 text-3xl md:text-4xl">{project.title}</h3>
                    {project.summary && <p className="mt-3 max-w-xl text-sm leading-7 text-[#77736d]">{project.summary}</p>}
                  </div>
                  <span className="pt-1 text-xs text-[#9c8062]">0{index + 2}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container mt-24 md:mt-32">
        <div className="grid gap-6 border-t border-[#dedad2] pt-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">Have something in mind?</p>
            <h2 className="display mt-3 max-w-3xl text-4xl md:text-6xl">Let’s make something meaningful.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#77736d]">For commissions, creative collaborations or a project you would like to discuss, get in touch.</p>
          </div>
          <Link href="/contact" className="inline-flex w-fit rounded-full bg-[#242320] px-7 py-4 text-[10px] uppercase tracking-[.15em] text-white transition-colors hover:bg-[#9c8062]">Discuss a project</Link>
        </div>
      </section>
    </main>
  );
}
